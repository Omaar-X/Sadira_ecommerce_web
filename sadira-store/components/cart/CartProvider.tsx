"use client";

import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  addCartItem,
  calculateCartCount,
  calculateCartSubtotal,
  removeCartItem,
  repriceCartItems,
  updateCartItemQuantity,
  type AddResult,
} from "@/lib/cart";
import { cartStore, hydrationStore } from "@/lib/cartStore";
import type { CartItem } from "@/types/cart";

interface CartContextValue {
  items: CartItem[];
  /** Total quantity across lines (header badge). */
  cartCount: number;
  subtotal: number;
  /** False until the saved cart has been read in the browser. */
  hydrated: boolean;
  /** `max` = live-aware quantity limit when known. */
  addItem: (item: CartItem, max?: number) => AddResult;
  removeItem: (key: string) => void;
  /** `max` = live-aware quantity limit when known. */
  updateQuantity: (key: string, quantity: number, max?: number) => void;
  clearCart: () => void;
  /** Applies server-reported current prices to matching lines. */
  repriceItems: (changes: Parameters<typeof repriceCartItems>[1]) => void;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const items = useSyncExternalStore(cartStore.subscribe, cartStore.getSnapshot, cartStore.getServerSnapshot);
  const hydrated = useSyncExternalStore(
    hydrationStore.subscribe,
    hydrationStore.getSnapshot,
    hydrationStore.getServerSnapshot,
  );
  const [isDrawerOpen, setDrawerOpen] = useState(false);

  const addItem = useCallback((item: CartItem, max?: number) => {
    const { items: next, result } = addCartItem(cartStore.getSnapshot(), item, max);
    if (result.status !== "at-limit") cartStore.set(next);
    return result;
  }, []);

  const removeItem = useCallback((key: string) => {
    cartStore.set(removeCartItem(cartStore.getSnapshot(), key));
  }, []);

  const updateQuantity = useCallback((key: string, quantity: number, max?: number) => {
    cartStore.set(updateCartItemQuantity(cartStore.getSnapshot(), key, quantity, max));
  }, []);

  const clearCart = useCallback(() => cartStore.set([]), []);
  const repriceItems = useCallback((changes: Parameters<typeof repriceCartItems>[1]) => {
    cartStore.set(repriceCartItems(cartStore.getSnapshot(), changes));
  }, []);
  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      cartCount: calculateCartCount(items),
      subtotal: calculateCartSubtotal(items),
      hydrated,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      repriceItems,
      isDrawerOpen,
      openDrawer,
      closeDrawer,
    }),
    [items, hydrated, addItem, removeItem, updateQuantity, clearCart, repriceItems, isDrawerOpen, openDrawer, closeDrawer],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside <CartProvider>");
  return context;
}
