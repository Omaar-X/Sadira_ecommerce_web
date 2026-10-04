"use client";

import { ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { IconButton } from "@/components/ui/IconButton";

/**
 * Header bag icon with the live item count (total quantity). Renders 0 on the
 * server and during hydration, then the saved cart's count.
 */
export function CartButton({ className }: { className?: string }) {
  const { cartCount, openDrawer, isDrawerOpen } = useCart();

  return (
    <IconButton
      label={`Open shopping bag, ${cartCount} ${cartCount === 1 ? "item" : "items"}`}
      icon={<ShoppingBag />}
      aria-haspopup="dialog"
      aria-expanded={isDrawerOpen}
      onClick={openDrawer}
      className={className}
      badge={
        <span className="absolute top-0.5 right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] leading-none font-semibold text-foreground tabular-nums">
          {cartCount > 99 ? "99+" : cartCount}
        </span>
      }
    />
  );
}
