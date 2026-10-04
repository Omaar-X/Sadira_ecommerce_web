import type { CartItem } from "@/types/cart";
import type { LiveInventoryItem } from "@/types/inventory";

/*
 * Stock rules shared by the storefront (pure, client-safe).
 *
 * Tracked stock is owned by Google Sheets (Products tab). The local catalog's
 * `stock` is only the initial seed and the fallback when live inventory isn't
 * available (e.g. local development without Apps Script). Final acceptance of
 * an order always happens in Apps Script, under its lock — never here.
 */

export interface ResolvedStock {
  /** Units available, or null when untracked (unknown — never treat as 0). */
  stock: number | null;
  /** True when the product is set "inactive" in the live inventory. */
  unavailable: boolean;
  /** True when the value came from live inventory rather than the catalog fallback. */
  live: boolean;
}

export interface InventoryView {
  /** Full live inventory, or null when not loaded/available. */
  products: ReadonlyMap<string, LiveInventoryItem> | null;
  /** Fresher per-product values (e.g. from a rejected order); win over `products`. */
  overrides?: ReadonlyMap<string, LiveInventoryItem>;
}

function fromLive(item: LiveInventoryItem): ResolvedStock {
  return {
    stock: item.trackStock ? (item.stock ?? 0) : null,
    unavailable: item.status !== "active",
    live: true,
  };
}

/** One product's stock: live value when known, otherwise the catalog fallback. */
export function resolveStock(productId: string, catalogStock: number | null, view: InventoryView): ResolvedStock {
  const override = view.overrides?.get(productId);
  if (override) return fromLive(override);
  if (!view.products) return { stock: catalogStock, unavailable: false, live: false };
  const item = view.products.get(productId);
  // No Products row → Apps Script treats the product as untracked; mirror that.
  return item ? fromLive(item) : { stock: null, unavailable: false, live: true };
}

/**
 * The same product can be in the bag several times (different sizes/designs);
 * stock is per product, so a warning compares the product's total quantity.
 */
export function getStockWarning(item: CartItem, items: CartItem[], resolved: ResolvedStock): string | null {
  if (!resolved.live) return null;
  if (resolved.unavailable) return "This item is currently unavailable. Please remove it from your bag.";
  if (resolved.stock === null) return null;
  if (resolved.stock === 0) return "This item is out of stock. Please remove it from your bag.";

  const lines = items.filter((line) => line.productId === item.productId);
  const total = lines.reduce((sum, line) => sum + line.quantity, 0);
  if (total <= resolved.stock) return null;
  return lines.length > 1
    ? `Only ${resolved.stock} are currently available across your selected options. Please update your quantities.`
    : `Only ${resolved.stock} are currently available. Please update your quantity.`;
}
