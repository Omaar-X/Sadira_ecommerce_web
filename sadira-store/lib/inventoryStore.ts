import type { InventoryApiResponse, LiveInventoryItem } from "@/types/inventory";

/*
 * Browser copy of live inventory for DISPLAY (product page, cards, bag
 * warnings). Loaded from this site's /api/inventory — never from Apps Script —
 * and refreshed at most once a minute (or when forced after an order).
 */

export interface InventorySnapshot {
  /** Full live inventory; null = not loaded/available → show the catalog stock. */
  products: ReadonlyMap<string, LiveInventoryItem> | null;
  /** Fresher values learned from a rejected order; replaced by the next full load. */
  overrides: ReadonlyMap<string, LiveInventoryItem>;
}

const REFRESH_MS = 60_000;
const EMPTY: InventorySnapshot = { products: null, overrides: new Map() };

let snapshot: InventorySnapshot = EMPTY;
let lastAttempt = 0;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function publish(next: InventorySnapshot) {
  snapshot = next;
  for (const listener of listeners) listener();
}

async function load() {
  lastAttempt = Date.now();
  try {
    const response = await fetch("/api/inventory", { cache: "no-store" });
    const data = (await response.json()) as InventoryApiResponse;
    if (data.success) {
      publish({ products: new Map(data.products.map((item) => [item.productId, item])), overrides: new Map() });
    }
  } catch {
    // Keep what we had; the catalog stock is shown until live inventory loads.
  }
}

/** Loads live inventory if it's missing or older than a minute (deduplicated). */
export function ensureInventory(force = false) {
  if (loading) return;
  if (!force && Date.now() - lastAttempt < REFRESH_MS) return;
  loading = load().finally(() => {
    loading = null;
  });
}

/** Re-fetch now (e.g. right after an order changed stock). */
export function refreshInventory() {
  ensureInventory(true);
}

/** Apply stock the server reported with a rejected order, so the bag's warnings update immediately. */
export function applyInventoryUpdates(items: LiveInventoryItem[] | undefined) {
  if (!items || items.length === 0) return;
  const overrides = new Map(snapshot.overrides);
  for (const item of items) overrides.set(item.productId, item);
  publish({ products: snapshot.products, overrides });
  refreshInventory();
}

export const inventoryStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: () => snapshot,
  getServerSnapshot: () => EMPTY,
};
