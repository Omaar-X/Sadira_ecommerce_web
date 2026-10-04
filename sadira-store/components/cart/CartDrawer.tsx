"use client";

import { Money } from "@/components/ui/Money";


import { useEffect, useId, useRef, type MouseEvent } from "react";
import { ShoppingBag, X } from "lucide-react";
import { CartLine } from "@/components/cart/CartLine";
import { useCart } from "@/components/cart/CartProvider";
import { ButtonLink } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { cartLineKey, pluralizeItems } from "@/lib/cart";
import { ROUTES } from "@/lib/constants";

/**
 * Right-side cart drawer (native modal <dialog>, like the menu and filters:
 * focus trap, Escape/backdrop close, page scroll locked, focus returns to the
 * button that opened it). Opened from the header bag and after Add to Cart.
 */
export function CartDrawer() {
  const { items, cartCount, subtotal, isDrawerOpen, closeDrawer } = useCart();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isDrawerOpen && !dialog.open) dialog.showModal();
    if (!isDrawerOpen && dialog.open) dialog.close();
  }, [isDrawerOpen]);

  // Close on backdrop clicks and when following any link inside the drawer.
  function handleClick(event: MouseEvent<HTMLDialogElement>) {
    const target = event.target as HTMLElement;
    if (target === event.currentTarget || target.closest("a")) closeDrawer();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={closeDrawer}
      onClick={handleClick}
      className="sadira-dialog group m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 text-foreground"
    >
      <div className="ml-auto flex h-full w-[92%] max-w-md translate-x-full flex-col bg-background transition-transform duration-300 ease-soft group-open:translate-x-0 starting:group-open:translate-x-full">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-5">
          <h2 id={titleId} className="flex items-baseline gap-2 font-serif text-xl">
            Your Bag
            {cartCount > 0 && <span className="font-sans text-xs text-muted">{pluralizeItems(cartCount)}</span>}
          </h2>
          <IconButton label="Close bag" icon={<X />} onClick={closeDrawer} className="-mr-2" />
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <span className="inline-flex size-14 items-center justify-center rounded-full bg-blush text-primary-dark">
              <ShoppingBag aria-hidden="true" className="size-6" strokeWidth={1.5} />
            </span>
            <p className="mt-5 font-serif text-xl">Your bag is empty.</p>
            <p className="mt-2 text-sm text-muted">Discover something you’ll love.</p>
            <ButtonLink href={ROUTES.shop} className="mt-6">
              Shop Collection
            </ButtonLink>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
              {items.map((item) => (
                <li key={cartLineKey(item)} className="py-5">
                  <CartLine item={item} />
                </li>
              ))}
            </ul>

            <div className="shrink-0 border-t border-line px-5 pt-4 pb-5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-foreground">Subtotal</span>
                <span className="text-lg font-medium"><Money amount={subtotal} /></span>
              </div>
              <p className="mt-1 text-xs text-muted">Delivery calculated at checkout</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <ButtonLink href={ROUTES.cart} variant="outline" fullWidth>
                  View Bag
                </ButtonLink>
                <ButtonLink href={ROUTES.checkout} fullWidth>
                  Checkout
                </ButtonLink>
              </div>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
