import type { LiveInventoryItem } from "@/types/inventory";
import type { PaymentMethod } from "@/types/order";

export type Division =
  | "Dhaka"
  | "Chattogram"
  | "Rajshahi"
  | "Khulna"
  | "Barishal"
  | "Sylhet"
  | "Rangpur"
  | "Mymensingh";

/** Used by the next phase to calculate the delivery charge. */
export type DeliveryArea = "inside-dhaka" | "outside-dhaka";

export type CheckoutMode = "cart" | "buy-now";

/** Raw form values, exactly as typed (strings; "" = empty). Kept in memory only. */
export interface CheckoutFormValues {
  name: string;
  phone: string;
  alternativePhone: string;
  email: string;
  division: Division | "";
  district: string;
  area: string;
  address: string;
  postalCode: string;
  deliveryArea: DeliveryArea | "";
  paymentMethod: PaymentMethod | "";
  note: string;
}

export type CheckoutField = keyof CheckoutFormValues;
export type CheckoutErrors = Partial<Record<CheckoutField, string>>;

/** One ordered line as the customer chose it. */
export interface CheckoutDraftItem {
  productId: string;
  size: string | null;
  color: string | null;
  design: string | null;
  quantity: number;
  /**
   * Unit price the customer saw (from the browser cart). NOT trusted: the
   * server re-reads the real price from the catalog and can use this only to
   * detect that a price changed.
   */
  displayedUnitPrice: number;
}

/**
 * Validated, normalised checkout data (built by lib/checkout.ts). The server
 * rebuilds this itself from the raw form — it never trusts the browser's copy.
 * No order ID or status: Apps Script creates those after the order is saved.
 */
export interface CheckoutOrderDraft {
  mode: CheckoutMode;
  customer: {
    name: string;
    /** Normalised, e.g. "+8801912345678". */
    phone: string;
    alternativePhone: string | null;
    email: string | null;
  };
  delivery: {
    division: Division;
    district: string;
    area: string;
    address: string;
    postalCode: string | null;
    deliveryArea: DeliveryArea;
  };
  items: CheckoutDraftItem[];
  /** Browser-side estimate for display; the server recalculates it. */
  subtotal: number;
  paymentMethod: PaymentMethod;
  note: string | null;
}

// ---- POST /api/orders ---------------------------------------------------------

/** Body the checkout sends. Everything is re-validated on the server. */
export interface OrderRequest {
  /** Random per attempt (crypto.randomUUID) — lets Apps Script ignore duplicate retries. */
  requestId: string;
  mode: CheckoutMode;
  form: CheckoutFormValues;
  items: CheckoutDraftItem[];
}

/** One line of a saved order, with server-verified prices. */
export interface ConfirmedOrderItem {
  productId: string;
  name: string;
  slug: string;
  image: string;
  size: string | null;
  color: string | null;
  design: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

/** An order confirmed as saved in Google Sheets (only what the success page needs). */
export interface ConfirmedOrder {
  orderId: string;
  /** Bangladesh time, "YYYY-MM-DD HH:mm:ss". */
  createdAt: string;
  items: ConfirmedOrderItem[];
  subtotal: number;
  deliveryCharge: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  orderStatus: "Pending";
  customer: { name: string; phone: string };
  delivery: { deliveryArea: DeliveryArea; address: string };
}

export type OrderErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "INVALID_ITEMS"
  | "PRICE_CHANGED"
  | "STOCK_UNAVAILABLE"
  | "PRODUCT_UNAVAILABLE"
  | "ORDERING_UNAVAILABLE"
  | "ORDER_SAVE_FAILED";

export interface PriceChange {
  productId: string;
  size: string | null;
  color: string | null;
  design: string | null;
  name: string;
  previousPrice: number;
  currentPrice: number;
}

export interface OrderError {
  code: OrderErrorCode;
  message: string;
  fieldErrors?: CheckoutErrors;
  priceChanges?: PriceChange[];
  /** e.g. ["Prada Milano Sunglasses: only 12 available"] */
  details?: string[];
  /** Live stock learned from a STOCK_UNAVAILABLE / PRODUCT_UNAVAILABLE answer (updates the bag's warnings). */
  inventory?: LiveInventoryItem[];
}

export type OrderApiResponse = { success: true; order: ConfirmedOrder } | ({ success: false } & OrderError);
