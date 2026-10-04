import { Money } from "@/components/ui/Money";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { StockWarning } from "@/components/inventory/StockWarning";
import { calculateCartSubtotal, cartLineKey, formatCartOptions, lineTotal } from "@/lib/cart";
import type { DeliveryCharges } from "@/lib/delivery";
import type { CartItem } from "@/types/cart";
import type { DeliveryArea } from "@/types/checkout";

export interface CheckoutSummaryProps {
  items: CartItem[];
  /** "Edit Bag" (cart) or "Back to Product" (Buy Now). */
  backLink: { href: string; label: string } | null;
  /** Configured charges (from the server, display only), or null when not configured. */
  deliveryCharges: DeliveryCharges | null;
  deliveryArea: DeliveryArea | "";
  className?: string;
}

function CheckoutItem({ item, items }: { item: CartItem; items: CartItem[] }) {
  return (
    <li className="flex gap-3 py-4">
      <span className="relative aspect-[3/4] w-14 shrink-0 overflow-hidden rounded-lg border border-line bg-blush/40">
        <Image src={item.image} alt={item.name} fill sizes="56px" className="object-cover" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-serif text-sm leading-snug text-foreground">{item.name}</p>
        <dl className="mt-1 space-y-0.5 text-xs text-muted">
          {formatCartOptions(item).map((option) => (
            <div key={option.label} className="flex gap-1">
              <dt>{option.label}:</dt>
              <dd className="text-foreground/80">{option.value}</dd>
            </div>
          ))}
          <div className="flex gap-1">
            <dt>Qty:</dt>
            <dd className="text-foreground/80">
              {item.quantity} × <Money amount={item.price} />
            </dd>
          </div>
        </dl>
        <StockWarning item={item} items={items} className="mt-1.5" />
      </div>
      <p className="text-sm font-medium whitespace-nowrap text-foreground">
        <span className="sr-only">Line total: </span>
        <Money amount={lineTotal(item)} />
      </p>
    </li>
  );
}

/**
 * Items and totals. Prices and the delivery charge shown here are for display —
 * the server recalculates everything from the catalog and its own delivery
 * config when the order is placed. Unknown delivery is never shown as ৳ 0.
 */
export function CheckoutSummary({ items, backLink, deliveryCharges, deliveryArea, className }: CheckoutSummaryProps) {
  const subtotal = calculateCartSubtotal(items);
  const deliveryCharge = deliveryCharges && deliveryArea ? deliveryCharges[deliveryArea] : null;

  return (
    <section aria-labelledby="checkout-summary-heading" className={className}>
      <div className="rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="checkout-summary-heading" className="font-serif text-xl">
            Order Summary
          </h2>
          {backLink && (
            <Link
              href={backLink.href}
              className="inline-flex items-center gap-1.5 text-xs text-muted underline decoration-foreground/20 underline-offset-4 transition-colors hover:text-primary-dark"
            >
              <ArrowLeft aria-hidden="true" className="size-3.5" />
              {backLink.label}
            </Link>
          )}
        </div>

        <ul className="mt-2 divide-y divide-line border-b border-line">
          {items.map((item) => (
            <CheckoutItem key={cartLineKey(item)} item={item} items={items} />
          ))}
        </ul>

        <dl className="mt-4 space-y-2.5 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Subtotal</dt>
            <dd className="font-medium"><Money amount={subtotal} /></dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Delivery</dt>
            <dd className={deliveryCharge === null ? "text-muted" : "font-medium"}>
              {deliveryCharge !== null
                ? <Money amount={deliveryCharge} />
                : deliveryCharges
                  ? "Select delivery area"
                  : "To be confirmed"}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
            <dt className="font-medium">{deliveryCharge === null ? "Estimated Total" : "Total"}</dt>
            <dd className="flex flex-col items-end">
              <span className="text-lg font-semibold whitespace-nowrap">
                <Money amount={subtotal + (deliveryCharge ?? 0)} />
              </span>
              {deliveryCharge === null && <span className="text-xs whitespace-nowrap text-muted">+ delivery</span>}
            </dd>
          </div>
        </dl>
        {!deliveryCharges && (
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Delivery charge will be configured before order submission is enabled.
          </p>
        )}
        <p className="mt-3 text-xs leading-relaxed text-muted">Payment: Cash on Delivery.</p>
      </div>
    </section>
  );
}
