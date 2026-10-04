"use client";

import { useState, useSyncExternalStore } from "react";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { EmptyState } from "@/components/common/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { readBuyNowItem, subscribeBuyNow } from "@/lib/buyNow";
import { ROUTES } from "@/lib/constants";
import type { DeliveryCharges, OrderingStatus } from "@/lib/delivery";
import type { CheckoutMode } from "@/types/checkout";

export interface CheckoutViewProps {
  mode: CheckoutMode;
  deliveryCharges: DeliveryCharges | null;
  ordering: OrderingStatus;
}

/**
 * Chooses what's being checked out: the bag (cart mode) or the single Buy Now
 * item from sessionStorage. Buy Now never falls back to the bag, and neither
 * is cleared until an order is confirmed as saved.
 */
export function CheckoutView({ mode, deliveryCharges, ordering }: CheckoutViewProps) {
  const { items: cartItems, hydrated } = useCart();
  const buyNowItem = useSyncExternalStore(subscribeBuyNow, readBuyNowItem, () => null);
  // Once the order is saved the bag empties; show this instead of an "empty bag" flash.
  const [placed, setPlaced] = useState(false);

  if (placed) {
    return (
      <p role="status" className="mt-10 flex items-center gap-3 text-sm text-muted">
        <LoadingSpinner size="sm" decorative />
        Order placed — opening your confirmation…
      </p>
    );
  }

  if (!hydrated) {
    return (
      <div aria-hidden="true" className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,62fr)_minmax(0,38fr)]">
        <div className="h-96 rounded-2xl bg-blush/50" />
        <div className="h-64 rounded-2xl bg-blush/50" />
      </div>
    );
  }

  if (mode === "buy-now" && !buyNowItem) {
    return (
      <EmptyState
        title="Your Buy Now selection is no longer available."
        action={<ButtonLink href={ROUTES.shop}>Return to Shop</ButtonLink>}
      />
    );
  }

  if (mode === "cart" && cartItems.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag strokeWidth={1.5} />}
        title="Your shopping bag is empty."
        action={<ButtonLink href={ROUTES.shop}>Start Shopping</ButtonLink>}
      />
    );
  }

  const items = mode === "buy-now" && buyNowItem ? [buyNowItem] : cartItems;
  const backLink =
    mode === "buy-now" && buyNowItem
      ? { href: ROUTES.product(buyNowItem.slug), label: "Back to Product" }
      : { href: ROUTES.cart, label: "Edit Bag" };

  return (
    <div className="mt-8 md:mt-10">
      <CheckoutForm
        items={items}
        mode={mode}
        backLink={backLink}
        deliveryCharges={deliveryCharges}
        ordering={ordering}
        onOrderPlaced={() => setPlaced(true)}
      />
    </div>
  );
}
