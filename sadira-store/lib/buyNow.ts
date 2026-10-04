import { parseCartItem } from "@/lib/cart";
import type { CartItem } from "@/types/cart";

/*
 * "Buy Now" hand-off to checkout: the single configured item is kept in
 * sessionStorage (this tab only) instead of the URL, and checkout opens with
 * ?mode=buy-now. It never touches the cart, and it's cleared only after the
 * order is confirmed as saved.
 */

const STORAGE_KEY = "sadira-buy-now";
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/** For useSyncExternalStore: re-read when the Buy Now item changes in this tab. */
export function subscribeBuyNow(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function saveBuyNowItem(item: CartItem): boolean {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ item, savedAt: Date.now() }));
    emit();
    return true;
  } catch {
    return false;
  }
}

/** Call only after the order has been saved. */
export function clearBuyNowItem() {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // nothing stored
  }
  emit();
}

let cachedRaw: string | null | undefined;
let cachedItem: CartItem | null = null;

/** The pending Buy Now item (validated), or null. Cached so it's a stable snapshot. */
export function readBuyNowItem(): CartItem | null {
  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    raw = null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedItem = raw ? parseCartItem((JSON.parse(raw) as { item?: unknown }).item) : null;
    } catch {
      cachedItem = null;
    }
  }
  return cachedItem;
}
