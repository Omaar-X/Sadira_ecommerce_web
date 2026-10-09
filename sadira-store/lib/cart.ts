import { PRODUCT_ORDER_LIMITS } from "@/lib/orderLimits";
import { getEffectivePrice } from "@/lib/pricing";
import type { CartItem, ProductSelection } from "@/types/cart";
import type { PublicProduct } from "@/types/product";

/*
 * Cart rules — pure functions shared by the header badge, cart drawer,
 * /cart page and (later) checkout, so counts and totals are computed one way.
 *
 * Prices here come from the browser (localStorage) and are for display only.
 * Checkout must re-read product existence, price and availability from the
 * catalog on the server before an order is saved; Apps Script makes the final
 * live-stock decision under its lock.
 */

/** Quantity cap when stock isn't tracked — a UI safety limit, not a stock claim. */
export const UNTRACKED_STOCK_MAX_QUANTITY = 10;

/**
 * Most units of a product one line may hold.
 *   `item.stock` — the CATALOG stock (null = the catalog doesn't track it; the
 *                  server then applies the same 10-per-line safety limit).
 *   `live`       — current stock from live inventory when known (overrides the
 *                  catalog; null = untracked). Can be 0 (out of stock).
 */
export function maxOrderQuantity(item: Pick<CartItem, "stock"> & { id?: string; productId?: string }, live?: { stock: number | null }): number {
  const stock = live ? live.stock : item.stock;
  const limit = stock ?? UNTRACKED_STOCK_MAX_QUANTITY;
  const purchaseLimit = PRODUCT_ORDER_LIMITS[item.id ?? item.productId ?? ""] ?? Infinity;
  return Math.min(purchaseLimit, item.stock === null ? Math.min(limit, UNTRACKED_STOCK_MAX_QUANTITY) : limit);
}

/**
 * Cart line for a configured product (Add to Cart / Buy Now). Null when the
 * product can't be bought online (no price, out of stock, or unavailable).
 * `live` = live stock when known (see maxOrderQuantity).
 */
export function createCartItem(
  product: PublicProduct,
  selection: ProductSelection,
  live?: { stock: number | null; unavailable?: boolean },
): CartItem | null {
  const price = getEffectivePrice(product);
  const max = maxOrderQuantity(product, live);
  if (price === null || max < 1 || live?.unavailable) return null;

  return {
    productId: product.id,
    slug: product.slug,
    name: product.name,
    // A chosen design shows its own photo (e.g. scarf Design 2); otherwise the cover.
    image: product.designs.find((design) => design.label === selection.design)?.image ?? product.images[0],
    category: product.category,
    size: selection.size,
    color: selection.color,
    design: selection.design,
    quantity: Math.min(Math.max(1, selection.quantity), max),
    price,
    stock: product.stock,
  };
}

// ---- Identity & display ------------------------------------------------------

type VariantFields = Pick<CartItem, "productId" | "size" | "color" | "design">;

/** Lines are the same only if product AND size, colour and design all match. */
export function cartLineKey(item: VariantFields): string {
  return JSON.stringify([item.productId, item.size, item.color, item.design]);
}

/** The chosen options that apply, e.g. [{ label: "Size", value: "54" }]. */
export function formatCartOptions(
  item: Pick<CartItem, "size" | "color" | "design">,
): { label: string; value: string }[] {
  const options: { label: string; value: string }[] = [];
  if (item.size) options.push({ label: "Size", value: item.size });
  if (item.color) options.push({ label: "Color", value: item.color });
  if (item.design) options.push({ label: "Design", value: item.design });
  return options;
}

// ---- Totals (whole taka → plain integer arithmetic) ---------------------------

export function lineTotal(item: Pick<CartItem, "price" | "quantity">): number {
  return item.price * item.quantity;
}

export function calculateCartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + lineTotal(item), 0);
}

/** Total quantity (2 abayas + 1 bag = 3), used for the header badge. */
export function calculateCartCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function pluralizeItems(count: number): string {
  return `${count} ${count === 1 ? "Item" : "Items"}`;
}

// ---- Updates (return new arrays) ----------------------------------------------

export type AddResult =
  | { status: "added"; quantity: number }
  /** Added, but reduced to the maximum allowed quantity. */
  | { status: "capped"; quantity: number }
  /** Nothing added: the line is already at the maximum. */
  | { status: "at-limit"; quantity: number };

/**
 * Adds a line, or increases the matching variant's quantity (never beyond its
 * maximum). `max` = the live-aware limit when known (default: catalog-based).
 */
export function addCartItem(
  items: CartItem[],
  item: CartItem,
  max: number = maxOrderQuantity(item),
): { items: CartItem[]; result: AddResult } {
  const key = cartLineKey(item);
  const existing = items.find((line) => cartLineKey(line) === key);
  const current = existing?.quantity ?? 0;

  if (current >= max) return { items, result: { status: "at-limit", quantity: current } };

  const quantity = Math.min(current + item.quantity, max);
  const status = current + item.quantity > max ? "capped" : "added";
  const next = existing
    ? items.map((line) => (line === existing ? { ...line, ...item, quantity } : line))
    : [...items, { ...item, quantity }];
  return { items: next, result: { status, quantity } };
}

/** Sets a line's quantity within 1…max. `max` = the live-aware limit when known (default: catalog-based). */
export function updateCartItemQuantity(items: CartItem[], key: string, quantity: number, max?: number): CartItem[] {
  return items.map((line) =>
    cartLineKey(line) === key
      ? { ...line, quantity: Math.max(1, Math.min(Math.round(quantity), max ?? maxOrderQuantity(line))) }
      : line,
  );
}

/** Applies current catalog prices reported by the server (e.g. after a PRICE_CHANGED response). */
export function repriceCartItems(
  items: CartItem[],
  changes: { productId: string; size: string | null; color: string | null; design: string | null; currentPrice: number }[],
): CartItem[] {
  const prices = new Map(changes.map((change) => [cartLineKey(change), change.currentPrice]));
  return items.map((line) => {
    const price = prices.get(cartLineKey(line));
    return price === undefined ? line : { ...line, price };
  });
}

export function removeCartItem(items: CartItem[], key: string): CartItem[] {
  return items.filter((line) => cartLineKey(line) !== key);
}

// ---- Validation of stored data ------------------------------------------------

const isString = (value: unknown): value is string => typeof value === "string" && value.length > 0;
const isOptionalString = (value: unknown): value is string | null => value === null || isString(value);
const isWholeNumber = (value: unknown, min: number): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= min;

/** A stored line is kept only if every field has the right shape; extra fields are dropped. */
export function parseCartItem(value: unknown): CartItem | null {
  if (typeof value !== "object" || value === null) return null;
  const line = value as Record<string, unknown>;
  const valid =
    isString(line.productId) &&
    isString(line.slug) &&
    isString(line.name) &&
    isString(line.image) &&
    line.image.startsWith("/") &&
    isString(line.category) &&
    isOptionalString(line.size) &&
    isOptionalString(line.color) &&
    isOptionalString(line.design) &&
    isWholeNumber(line.quantity, 1) &&
    isWholeNumber(line.price, 0) &&
    (line.stock === null || isWholeNumber(line.stock, 1));
  if (!valid) return null;

  const item: CartItem = {
    productId: line.productId as string,
    slug: line.slug as string,
    name: line.name as string,
    image: line.image as string,
    category: line.category as string,
    size: line.size as string | null,
    color: line.color as string | null,
    design: line.design as string | null,
    quantity: line.quantity as number,
    price: line.price as number,
    stock: line.stock as number | null,
  };
  return { ...item, quantity: Math.min(item.quantity, maxOrderQuantity(item)) };
}

/** Parses stored cart data; malformed lines are dropped and duplicate variants merged. */
export function parseStoredCart(raw: string | null): CartItem[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  const lines = (data as { items?: unknown })?.items;
  if (!Array.isArray(lines)) return [];

  return lines.reduce<CartItem[]>((items, value) => {
    const item = parseCartItem(value);
    return item ? addCartItem(items, item).items : items;
  }, []);
}
