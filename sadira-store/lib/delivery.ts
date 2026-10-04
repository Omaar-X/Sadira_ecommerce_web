import type { DeliveryArea } from "@/types/checkout";

/*
 * SERVER-ONLY configuration (reads non-public env vars — never import from a
 * Client Component; pass values down as props instead).
 *
 *   DELIVERY_CHARGE_INSIDE_DHAKA   whole taka (digits only)
 *   DELIVERY_CHARGE_OUTSIDE_DHAKA  whole taka (digits only)
 *
 * Blank or invalid values mean "not configured" — never ৳0. Online ordering
 * stays disabled until both charges are configured.
 */

export type DeliveryCharges = Record<DeliveryArea, number>;

function parseCharge(value: string | undefined): number | null {
  const trimmed = value?.trim();
  return trimmed && /^\d{1,5}$/.test(trimmed) ? Number(trimmed) : null;
}

/** Both configured charges, or null if either is missing/invalid. */
export function getDeliveryCharges(): DeliveryCharges | null {
  const inside = parseCharge(process.env.DELIVERY_CHARGE_INSIDE_DHAKA);
  const outside = parseCharge(process.env.DELIVERY_CHARGE_OUTSIDE_DHAKA);
  return inside === null || outside === null ? null : { "inside-dhaka": inside, "outside-dhaka": outside };
}

export function isDeliveryConfigured(): boolean {
  return getDeliveryCharges() !== null;
}

export function getDeliveryCharge(area: DeliveryArea): number | null {
  return getDeliveryCharges()?.[area] ?? null;
}

export interface AppsScriptConfig {
  url: string;
  secret: string;
}

/** Apps Script web app URL + shared secret (server env only), or null if not set up. */
export function getAppsScriptConfig(): AppsScriptConfig | null {
  const url = process.env.APPS_SCRIPT_ORDER_URL?.trim();
  const secret = process.env.APPS_SCRIPT_SECRET?.trim();
  if (!url || !secret || secret.length < 16) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && process.env.NODE_ENV === "production") return null;
  } catch {
    return null;
  }
  return { url, secret };
}

export interface OrderingStatus {
  available: boolean;
  /** Customer-facing reason when unavailable. */
  message: string | null;
}

/** Whether online orders can be placed right now (both charges + Apps Script configured). */
export function getOrderingStatus(): OrderingStatus {
  if (!isDeliveryConfigured()) {
    return {
      available: false,
      message: "Online ordering is not available yet because delivery charges have not been configured.",
    };
  }
  if (!getAppsScriptConfig()) {
    return { available: false, message: "Online ordering is not available yet. Please try again soon." };
  }
  return { available: true, message: null };
}
