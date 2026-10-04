import { parseStoredCart } from "@/lib/cart";
import type { CartItem } from "@/types/cart";

/*
 * Browser cart storage (localStorage), exposed as an external store for
 * React's useSyncExternalStore. The server snapshot is always an empty cart,
 * so server HTML and the first client render match (no hydration mismatch);
 * the saved cart appears right after hydration. Syncs across tabs.
 */

const STORAGE_KEY = "sadira-cart";
const STORAGE_VERSION = 1;
const EMPTY: CartItem[] = [];

let items: CartItem[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function read(): CartItem[] {
  try {
    return parseStoredCart(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return EMPTY; // storage blocked (private mode, disabled cookies…)
  }
}

function emit() {
  for (const listener of listeners) listener();
}

function onStorage(event: StorageEvent) {
  if (event.key !== STORAGE_KEY) return;
  items = read();
  emit();
}

export const cartStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    if (listeners.size === 1) window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) window.removeEventListener("storage", onStorage);
    };
  },

  getSnapshot(): CartItem[] {
    if (!loaded) {
      loaded = true;
      items = read();
    }
    return items;
  },

  getServerSnapshot(): CartItem[] {
    return EMPTY;
  },

  set(next: CartItem[]) {
    items = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, items: next }));
    } catch {
      // Keep working in memory if storage is unavailable or full.
    }
    emit();
  },
};

// ---- Hydration flag ----------------------------------------------------------

const noopSubscribe = () => () => {};

/** For useSyncExternalStore: false during server render and hydration, true after. */
export const hydrationStore = {
  subscribe: noopSubscribe,
  getSnapshot: () => true,
  getServerSnapshot: () => false,
};
