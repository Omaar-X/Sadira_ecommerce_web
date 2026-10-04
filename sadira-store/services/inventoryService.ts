import { callAppsScript } from "@/services/appsScript";
import type { InventoryStatus, LiveInventoryItem } from "@/types/inventory";

/*
 * SERVER ONLY. Live stock from the Google Sheets Products tab, for DISPLAY
 * (product pages, cards, cart warnings, shop filters). Cached briefly.
 *
 * Never used to accept an order: Apps Script re-checks stock under its lock
 * when the order is saved. Returns null when live inventory isn't available
 * (Apps Script not configured / unreachable) → callers fall back to the catalog.
 */

const CACHE_TTL_MS = 30_000;
const TIMEOUT_MS = 6_000;

// A failed load is cached too (items: null), so an Apps Script outage doesn't slow every page.
let cache: { at: number; items: LiveInventoryItem[] | null } | null = null;
let inflight: Promise<LiveInventoryItem[] | null> | null = null;
let generation = 0;

function parseItem(value: unknown): LiveInventoryItem | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.productId !== "string" || !/^[A-Za-z0-9-]{1,64}$/.test(raw.productId)) return null;
  const trackStock = raw.trackStock === true;
  const stock = typeof raw.stock === "number" && Number.isInteger(raw.stock) && raw.stock >= 0 ? raw.stock : null;
  const status: InventoryStatus = raw.status === "active" ? "active" : "inactive";
  return {
    productId: raw.productId,
    trackStock,
    // Tracked without a valid number can't be sold → 0. Untracked → null (unknown, not 0).
    stock: trackStock ? (stock ?? 0) : null,
    status,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt.slice(0, 40) : "",
  };
}

async function fetchInventory(): Promise<LiveInventoryItem[] | null> {
  const data = await callAppsScript({ action: "inventory" }, { timeoutMs: TIMEOUT_MS, label: "inventory" });
  if (!data || data.success !== true || !Array.isArray(data.products)) return null;
  return data.products.map(parseItem).filter((item): item is LiveInventoryItem => item !== null);
}

/** Live inventory (cached up to 30 s), or null when unavailable. */
export async function getLiveInventory(): Promise<LiveInventoryItem[] | null> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.items;
  if (!inflight) {
    const started = generation;
    inflight = fetchInventory().then((items) => {
      // A load that started before an invalidation may hold pre-order stock: return it, don't cache it.
      if (started === generation) cache = { at: Date.now(), items };
      return items;
    });
    const current = inflight;
    void current.finally(() => {
      if (inflight === current) inflight = null;
    });
  }
  return inflight;
}

/** Live inventory as a map, or null when unavailable. */
export async function getLiveInventoryMap(): Promise<Map<string, LiveInventoryItem> | null> {
  const items = await getLiveInventory();
  return items ? new Map(items.map((item) => [item.productId, item])) : null;
}

/** Drop the cached copy (after an order changed stock, or a stock error showed it was stale). */
export function invalidateInventoryCache() {
  cache = null;
  inflight = null; // the next caller starts a fresh load
  generation++;
}
