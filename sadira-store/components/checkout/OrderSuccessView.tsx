"use client";

import { Money } from "@/components/ui/Money";


import { useSyncExternalStore } from "react";
import Image from "next/image";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { buttonClassName, ButtonLink } from "@/components/ui/Button";
import { hydrationStore } from "@/lib/cartStore";
import { formatCartOptions } from "@/lib/cart";
import { ROUTES } from "@/lib/constants";
import { deliveryAreaLabel, getOrderConfirmationWhatsAppUrl, paymentLabel } from "@/lib/orderConfirmation";
import { readConfirmedOrder } from "@/lib/orderHandoff";
import { toLocalBangladeshiPhone } from "@/lib/phone";

const noopSubscribe = () => () => {};

/** Shows the order confirmed by the server (from the sessionStorage hand-off). */
export function OrderSuccessView() {
  const hydrated = useSyncExternalStore(
    hydrationStore.subscribe,
    hydrationStore.getSnapshot,
    hydrationStore.getServerSnapshot,
  );
  const order = useSyncExternalStore(noopSubscribe, readConfirmedOrder, () => null);

  if (!hydrated) return <div aria-hidden="true" className="mx-auto mt-10 h-96 max-w-2xl rounded-2xl bg-blush/50" />;

  if (!order) {
    return (
      <EmptyState
        headingLevel="h1"
        title="No recent order to show."
        description="Successful orders receive an Order ID. If you need help with an order, please contact Sadira."
        action={<ButtonLink href={ROUTES.shop}>Continue Shopping</ButtonLink>}
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        <span className="inline-flex size-14 items-center justify-center rounded-full bg-blush text-primary-dark">
          <CheckCircle2 aria-hidden="true" className="size-7" strokeWidth={1.5} />
        </span>
        <h1 className="mt-5 text-3xl text-foreground md:text-4xl">Thank You!</h1>
        <p className="mt-2 text-sm text-muted md:text-base">Your order has been placed successfully.</p>

        <div className="mt-6 inline-flex flex-col items-center rounded-2xl border border-line bg-white px-6 py-4">
          <span className="text-xs tracking-[0.2em] text-muted uppercase">Order ID</span>
          <span className="mt-1 font-mono text-xl font-semibold tracking-wide text-foreground select-all sm:text-2xl">
            {order.orderId}
          </span>
        </div>
      </div>

      <section aria-labelledby="order-details-heading" className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="order-details-heading" className="font-serif text-xl">
          Order Details
        </h2>

        <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted">Name</dt>
            <dd className="mt-0.5">{order.customer.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Phone</dt>
            <dd className="mt-0.5 tabular-nums">{toLocalBangladeshiPhone(order.customer.phone)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-muted">Delivery Address</dt>
            <dd className="mt-0.5">{order.delivery.address}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Payment Method</dt>
            <dd className="mt-0.5">{paymentLabel(order)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Order Status</dt>
            <dd className="mt-0.5">{order.orderStatus}</dd>
          </div>
        </dl>

        <ul className="mt-6 divide-y divide-line border-y border-line">
          {order.items.map((item) => (
            <li key={`${item.productId}-${item.size}-${item.color}-${item.design}`} className="flex gap-3 py-4">
              <span className="relative aspect-[3/4] w-14 shrink-0 overflow-hidden rounded-lg border border-line bg-blush/40">
                <Image src={item.image} alt={item.name} fill sizes="56px" className="object-cover" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-serif text-sm">{item.name}</p>
                <p className="mt-1 text-xs text-muted">
                  {[...formatCartOptions(item).map((o) => `${o.label}: ${o.value}`), `Qty: ${item.quantity}`].join(
                    " · ",
                  )}
                </p>
              </div>
              <p className="text-sm font-medium whitespace-nowrap"><Money amount={item.lineTotal} /></p>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Subtotal</dt>
            <dd className="whitespace-nowrap"><Money amount={order.subtotal} /></dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Delivery Charge ({deliveryAreaLabel(order)})</dt>
            <dd className="whitespace-nowrap"><Money amount={order.deliveryCharge} /></dd>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Discount</dt>
              <dd className="whitespace-nowrap">−<Money amount={order.discount} /></dd>
            </div>
          )}
          <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
            <dt className="font-medium">Total</dt>
            <dd className="text-lg font-semibold whitespace-nowrap"><Money amount={order.total} /></dd>
          </div>
        </dl>
      </section>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        {/* Optional: the order is already saved. This only opens a pre-filled chat — the customer presses Send. */}
        <a
          href={getOrderConfirmationWhatsAppUrl(order)}
          target="_blank"
          rel="noopener noreferrer"
          // The label may wrap on narrow phones: let the height grow (h-auto! beats the size's fixed h-13).
          className={buttonClassName({ size: "lg", fullWidth: true, className: "h-auto! min-h-13 py-3 text-center" })}
        >
          <MessageCircle aria-hidden="true" className="size-4 shrink-0" />
          <span className="whitespace-normal">Send Order Confirmation on WhatsApp</span>
          <span className="sr-only">(opens WhatsApp in a new tab)</span>
        </a>
        <ButtonLink href={ROUTES.shop} variant="outline" size="lg" fullWidth className="sm:max-w-56">
          Continue Shopping
        </ButtonLink>
      </div>
      <p className="mt-3 text-center text-xs leading-relaxed text-muted sm:text-left">
        Your order is saved. Sending the WhatsApp confirmation is optional — it opens WhatsApp with your order
        details, and you choose whether to press Send.
      </p>
    </div>
  );
}
