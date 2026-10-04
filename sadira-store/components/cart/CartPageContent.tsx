"use client";

import { Money } from "@/components/ui/Money";


import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { CartLine } from "@/components/cart/CartLine";
import { useCart } from "@/components/cart/CartProvider";
import { EmptyState } from "@/components/common/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cartLineKey, pluralizeItems } from "@/lib/cart";
import { ROUTES } from "@/lib/constants";

/** /cart contents. `suggestions` (server-rendered product cards) shows when the bag is empty. */
export function CartPageContent({ suggestions }: { suggestions?: ReactNode }) {
  const { items, cartCount, subtotal, hydrated, clearCart } = useCart();
  const [confirmingClear, setConfirmingClear] = useState(false);

  // The saved cart is only known after hydration — don't flash "empty" first.
  if (!hydrated) {
    return (
      <div aria-hidden="true" className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,65fr)_minmax(0,35fr)]">
        <div className="h-48 rounded-2xl bg-blush/50" />
        <div className="h-64 rounded-2xl bg-blush/50" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <>
        <EmptyState
          icon={<ShoppingBag strokeWidth={1.5} />}
          title="Your shopping bag is empty."
          description="Discover something you’ll love."
          action={<ButtonLink href={ROUTES.shop}>Start Shopping</ButtonLink>}
        />
        {suggestions}
      </>
    );
  }

  return (
    <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,65fr)_minmax(0,35fr)] lg:gap-12">
      <section aria-labelledby="bag-items-heading">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <h2 id="bag-items-heading" className="text-sm text-muted">
            {pluralizeItems(cartCount)}
          </h2>
          <button
            type="button"
            onClick={() => setConfirmingClear(true)}
            className="text-xs text-muted underline decoration-foreground/20 underline-offset-4 transition-colors hover:text-primary-dark"
          >
            Clear Bag
          </button>
        </div>
        <ul className="divide-y divide-line">
          {items.map((item) => (
            <li key={cartLineKey(item)} className="py-6">
              <CartLine item={item} variant="full" />
            </li>
          ))}
        </ul>
        <Link
          href={ROUTES.shop}
          className="mt-2 inline-flex items-center gap-2 text-sm text-foreground transition-colors hover:text-primary-dark"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Continue Shopping
        </Link>
      </section>

      <aside aria-labelledby="summary-heading" className="lg:sticky lg:top-28 lg:self-start">
        <div className="rounded-2xl border border-line bg-white p-5 sm:p-6">
          <h2 id="summary-heading" className="font-serif text-xl">
            Order Summary
          </h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Subtotal</dt>
              <dd className="font-medium"><Money amount={subtotal} /></dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Delivery</dt>
              <dd className="text-right text-muted">Calculated at checkout</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-t border-line pt-4">
              <dt className="font-medium">Total</dt>
              <dd className="text-lg font-semibold"><Money amount={subtotal} /></dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-muted">
            Total before delivery. Delivery charge and any discount are added at checkout.
          </p>
          <ButtonLink href={ROUTES.checkout} size="lg" fullWidth className="mt-6">
            Proceed to Checkout
          </ButtonLink>
          <ButtonLink href={ROUTES.shop} variant="ghost" fullWidth className="mt-2">
            Continue Shopping
          </ButtonLink>
        </div>
      </aside>

      <ConfirmDialog
        open={confirmingClear}
        title="Clear your shopping bag?"
        description="All items will be removed from your bag."
        confirmLabel="Clear Bag"
        onConfirm={() => {
          clearCart();
          setConfirmingClear(false);
        }}
        onCancel={() => setConfirmingClear(false)}
      />
    </div>
  );
}
