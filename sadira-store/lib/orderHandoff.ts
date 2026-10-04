import type { ConfirmedOrder } from "@/types/checkout";

/*
 * Hands the server-confirmed order from checkout to /order-success in
 * sessionStorage (this tab only, gone when it closes) — never in the URL.
 * It survives a refresh of the success page.
 */

const STORAGE_KEY = "sadira-last-order";

export function saveConfirmedOrder(order: ConfirmedOrder) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  } catch {
    // The order is saved in the Sheet regardless; the success page will just be brief.
  }
}

function isConfirmedOrder(value: unknown): value is ConfirmedOrder {
  if (typeof value !== "object" || value === null) return false;
  const order = value as Partial<ConfirmedOrder>;
  return (
    typeof order.orderId === "string" &&
    /^SAD-\d{8}-\d{4,}$/.test(order.orderId) &&
    Array.isArray(order.items) &&
    order.items.length > 0 &&
    typeof order.subtotal === "number" &&
    typeof order.deliveryCharge === "number" &&
    typeof order.total === "number" &&
    typeof order.customer?.name === "string" &&
    typeof order.customer?.phone === "string" &&
    typeof order.delivery?.address === "string"
  );
}

let cachedRaw: string | null | undefined;
let cachedOrder: ConfirmedOrder | null = null;

/** The last confirmed order in this tab, or null. Cached for useSyncExternalStore. */
export function readConfirmedOrder(): ConfirmedOrder | null {
  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    raw = null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      cachedOrder = isConfirmedOrder(parsed) ? parsed : null;
    } catch {
      cachedOrder = null;
    }
  }
  return cachedOrder;
}
