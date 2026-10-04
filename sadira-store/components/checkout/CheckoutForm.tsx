"use client";

import { useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";
import { AlertCircle, Info } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { CheckoutSummary } from "@/components/checkout/CheckoutSummary";
import { Button } from "@/components/ui/Button";
import { SelectField, TextAreaField, TextField } from "@/components/ui/FormField";
import { clearBuyNowItem, saveBuyNowItem } from "@/lib/buyNow";
import { cartLineKey } from "@/lib/cart";
import { applyInventoryUpdates, refreshInventory } from "@/lib/inventoryStore";
import {
  DELIVERY_AREAS,
  DIVISIONS,
  EMPTY_CHECKOUT_FORM,
  LIMITS,
  PAYMENT_METHODS,
  firstInvalidField,
  toDraftItems,
  validateCheckout,
} from "@/lib/checkout";
import type { DeliveryCharges, OrderingStatus } from "@/lib/delivery";
import { saveConfirmedOrder } from "@/lib/orderHandoff";
import { cn, formatPrice } from "@/lib/utils";
import type { CartItem } from "@/types/cart";
import type {
  CheckoutErrors,
  CheckoutField,
  CheckoutFormValues,
  CheckoutMode,
  OrderApiResponse,
  OrderRequest,
} from "@/types/checkout";

const fieldId = (field: CheckoutField) => `checkout-${field}`;
const ORDER_SUCCESS_PATH = "/order-success";

interface Feedback {
  tone: "error" | "info";
  message: string;
  details?: string[];
}

export interface CheckoutFormProps {
  items: CartItem[];
  mode: CheckoutMode;
  backLink: { href: string; label: string } | null;
  /** From the server config (display only — the server recalculates on submit). */
  deliveryCharges: DeliveryCharges | null;
  ordering: OrderingStatus;
  /** Called once the order is confirmed saved, before the bag is cleared. */
  onOrderPlaced: () => void;
}

/**
 * Customer, delivery and payment details → POST /api/orders. Values stay in
 * memory (never stored). The bag / Buy Now item are cleared and the success
 * page opened ONLY after the server confirms the order was saved in Sheets.
 */
export function CheckoutForm({ items, mode, backLink, deliveryCharges, ordering, onOrderPlaced }: CheckoutFormProps) {
  const router = useRouter();
  const { clearCart, repriceItems } = useCart();
  const [values, setValues] = useState<CheckoutFormValues>(EMPTY_CHECKOUT_FORM);
  const [attempted, setAttempted] = useState(false);
  const [serverErrors, setServerErrors] = useState<CheckoutErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  // Same details + items → same request ID, so a retry after a lost response can't create a second order.
  const request = useRef<{ signature: string; id: string } | null>(null);
  // Synchronous guard: blocks a second submit even before the disabled button re-renders.
  const inFlight = useRef(false);

  // After the first attempt, errors update live so they clear as fields are fixed.
  const errors: CheckoutErrors = attempted ? { ...serverErrors, ...validateCheckout(values) } : {};
  const errorCount = Object.keys(errors).length;

  function update(field: CheckoutField) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { value } = event.target;
      setValues((current) => ({ ...current, [field]: value }));
      setServerErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
      setFeedback(null);
    };
  }

  function requestIdFor(body: Omit<OrderRequest, "requestId">): string {
    const signature = JSON.stringify(body);
    if (request.current?.signature !== signature) {
      request.current = { signature, id: crypto.randomUUID() };
    }
    return request.current.id;
  }

  function applyPriceChanges(changes: NonNullable<Extract<OrderApiResponse, { success: false }>["priceChanges"]>) {
    if (mode === "cart") {
      repriceItems(changes);
    } else {
      const item = items[0];
      const change = changes.find((c) => cartLineKey(c) === cartLineKey(item));
      if (change) saveBuyNowItem({ ...item, price: change.currentPrice });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;

    if (!ordering.available) {
      setFeedback({ tone: "info", message: "Online ordering is currently unavailable. Please contact Sadira for help." });
      return;
    }

    setAttempted(true);
    setServerErrors({});
    const invalid = firstInvalidField(validateCheckout(values));
    if (invalid) {
      setFeedback(null);
      document.getElementById(fieldId(invalid))?.focus();
      return;
    }

    const body = { mode, form: values, items: toDraftItems(items) };
    const payload: OrderRequest = { requestId: requestIdFor(body), ...body };

    inFlight.current = true;
    setSubmitting(true);
    setFeedback(null);

    let data: OrderApiResponse | null = null;
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      data = (await response.json()) as OrderApiResponse;
    } catch {
      data = null;
    }

    if (!data) {
      inFlight.current = false;
      setSubmitting(false);
      setFeedback({ tone: "error", message: "We couldn't place your order. Please try again." });
      return;
    }

    if (data.success) {
      // Saved in Google Sheets — only now hand off, clear, and move on.
      saveConfirmedOrder(data.order);
      refreshInventory(); // stock just changed
      onOrderPlaced();
      if (mode === "cart") clearCart();
      else clearBuyNowItem();
      router.replace(ORDER_SUCCESS_PATH);
      return; // keep the button (and guard) disabled while navigating
    }

    inFlight.current = false;
    setSubmitting(false);
    switch (data.code) {
      case "VALIDATION_ERROR":
        setServerErrors(data.fieldErrors ?? {});
        setFeedback({ tone: "error", message: data.message });
        break;
      case "PRICE_CHANGED":
        applyPriceChanges(data.priceChanges ?? []);
        setFeedback({
          tone: "error",
          message: data.message,
          details: (data.priceChanges ?? []).map(
            (change) => `${change.name}: ${formatPrice(change.previousPrice)} → ${formatPrice(change.currentPrice)}`,
          ),
        });
        break;
      case "STOCK_UNAVAILABLE":
      case "PRODUCT_UNAVAILABLE":
        // Nothing was saved. Show the live stock on the bag lines so the customer can adjust and retry.
        applyInventoryUpdates(data.inventory);
        setFeedback({ tone: "error", message: data.message, details: data.details });
        break;
      default:
        setFeedback({ tone: data.code === "ORDERING_UNAVAILABLE" ? "info" : "error", message: data.message, details: data.details });
    }
  }

  const text = (field: CheckoutField) => ({
    id: fieldId(field),
    name: field,
    value: values[field],
    onChange: update(field),
    error: errors[field],
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      aria-label="Checkout"
      className="grid gap-8 lg:grid-cols-[minmax(0,62fr)_minmax(0,38fr)] lg:gap-x-12 lg:gap-y-8 xl:gap-x-16"
    >
      <div className="flex flex-col gap-10 lg:col-start-1 lg:row-start-1">
        {!ordering.available && <p role="status" className="rounded-xl border border-line bg-blush/60 p-4 text-sm leading-relaxed text-foreground">
          Online ordering is currently unavailable. Please <Link href={ROUTES.contact} className="underline underline-offset-4">contact Sadira</Link> for help.
        </p>}
        <Section title="Contact Details">
          <TextField
            {...text("name")}
            label="Full Name"
            placeholder="Your full name"
            autoComplete="name"
            maxLength={LIMITS.name}
            className="sm:col-span-2"
          />
          <TextField
            {...text("phone")}
            label="Phone Number"
            type="tel"
            inputMode="tel"
            placeholder="01XXXXXXXXX"
            autoComplete="tel"
            maxLength={20}
          />
          <TextField
            {...text("alternativePhone")}
            label="Alternative Phone"
            optional
            type="tel"
            inputMode="tel"
            placeholder="01XXXXXXXXX"
            autoComplete="off"
            maxLength={20}
          />
          <TextField
            {...text("email")}
            label="Email"
            optional
            type="email"
            inputMode="email"
            placeholder="you@example.com"
            autoComplete="email"
            maxLength={LIMITS.email}
            className="sm:col-span-2"
          />
        </Section>

        <Section title="Delivery Address">
          <SelectField {...text("division")} label="Division" autoComplete="address-level1">
            <option value="">Select division</option>
            {DIVISIONS.map((division) => (
              <option key={division} value={division}>
                {division}
              </option>
            ))}
          </SelectField>
          <TextField
            {...text("district")}
            label="District"
            placeholder="e.g. Gazipur"
            autoComplete="address-level2"
            maxLength={LIMITS.district}
          />
          <TextField
            {...text("area")}
            label="Area / Thana"
            placeholder="e.g. Tongi"
            autoComplete="address-level3"
            maxLength={LIMITS.area}
          />
          <TextField
            {...text("postalCode")}
            label="Postal Code"
            optional
            inputMode="numeric"
            placeholder="e.g. 1710"
            autoComplete="postal-code"
            maxLength={4}
          />
          <TextAreaField
            {...text("address")}
            label="Full Address"
            placeholder="House, road, area, landmark"
            autoComplete="street-address"
            maxLength={LIMITS.address}
            rows={3}
            className="sm:col-span-2"
          />
        </Section>

        <ChoiceGroup
          field="deliveryArea"
          legend="Delivery Area"
          options={DELIVERY_AREAS}
          value={values.deliveryArea}
          onChange={update("deliveryArea")}
          error={errors.deliveryArea}
          hint="Used to calculate your delivery charge."
        />

        <ChoiceGroup
          field="paymentMethod"
          legend="Payment Method"
          options={PAYMENT_METHODS}
          value={values.paymentMethod}
          onChange={update("paymentMethod")}
          error={errors.paymentMethod}
        />

        <TextAreaField
          {...text("note")}
          label="Order Note"
          optional
          placeholder="Any delivery instruction or additional note"
          maxLength={LIMITS.note}
          rows={3}
          hint={`${values.note.length}/${LIMITS.note}`}
        />
      </div>

      <div className="lg:sticky lg:top-28 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
        <CheckoutSummary
          items={items}
          backLink={backLink}
          deliveryCharges={deliveryCharges}
          deliveryArea={values.deliveryArea}
        />
      </div>

      <div className="lg:col-start-1 lg:row-start-2">
        {attempted && errorCount > 0 && (
          <p role="alert" className="mb-4 text-sm text-primary-dark">
            Please check the {errorCount === 1 ? "highlighted field" : `${errorCount} highlighted fields`}.
          </p>
        )}
        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={submitting}
          disabled={!ordering.available}
          aria-disabled={submitting || !ordering.available || undefined}
          className="sm:w-auto sm:min-w-64"
        >
          {submitting ? "Placing Order..." : "Place Order"}
        </Button>
        {feedback && (
          <div
            role={feedback.tone === "error" ? "alert" : "status"}
            className={cn(
              "mt-4 flex gap-2.5 rounded-xl border px-4 py-3 text-sm leading-relaxed text-foreground",
              feedback.tone === "error" ? "border-primary-dark/40 bg-blush" : "border-line bg-blush/60",
            )}
          >
            {feedback.tone === "error" ? (
              <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary-dark" />
            ) : (
              <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary-dark" />
            )}
            <div>
              <p>{feedback.message}</p>
              {feedback.details && feedback.details.length > 0 && (
                <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-xs text-muted">
                  {feedback.details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="font-serif text-xl text-foreground">{title}</legend>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

interface ChoiceGroupProps {
  field: CheckoutField;
  legend: string;
  options: { value: string; label: string; description?: string }[];
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  hint?: string;
}

/** Radio cards in a fieldset; the first radio carries the field id so it can receive focus. */
function ChoiceGroup({ field, legend, options, value, onChange, error, hint }: ChoiceGroupProps) {
  const messageId = `${fieldId(field)}-message`;
  return (
    <fieldset aria-describedby={error || hint ? messageId : undefined}>
      <legend className="font-serif text-xl text-foreground">{legend}</legend>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {options.map((option, index) => {
          const checked = value === option.value;
          return (
            <label
              key={option.value}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border bg-white p-4 transition-colors",
                checked ? "border-primary-dark bg-blush/40" : "border-line hover:border-primary/60",
                error && !checked && "border-primary-dark/60",
              )}
            >
              <input
                id={index === 0 ? fieldId(field) : undefined}
                type="radio"
                name={field}
                value={option.value}
                checked={checked}
                onChange={onChange}
                className="mt-0.5 size-4 shrink-0 scroll-mt-32 accent-primary-dark"
              />
              <span className="flex flex-col">
                <span className="text-sm font-medium text-foreground">{option.label}</span>
                {option.description && <span className="mt-0.5 text-xs text-muted">{option.description}</span>}
              </span>
            </label>
          );
        })}
      </div>
      {(error || hint) && (
        <p id={messageId} className={cn("mt-2 text-xs", error ? "text-primary-dark" : "text-muted")}>
          {error ?? hint}
        </p>
      )}
    </fieldset>
  );
}
