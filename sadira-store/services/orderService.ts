import { maxOrderQuantity } from "@/lib/cart";
import { EMPTY_CHECKOUT_FORM, normalizeCheckoutDetails, validateCheckout } from "@/lib/checkout";
import { getDeliveryCharge, getOrderingStatus } from "@/lib/delivery";
import { getEffectivePrice } from "@/lib/pricing";
import { callAppsScript } from "@/services/appsScript";
import { invalidateInventoryCache } from "@/services/inventoryService";
import { getProducts } from "@/services/productService";
import type {
  CheckoutDraftItem,
  CheckoutFormValues,
  CheckoutMode,
  ConfirmedOrder,
  ConfirmedOrderItem,
  OrderError,
  OrderRequest,
  PriceChange,
} from "@/types/checkout";
import type { LiveInventoryItem } from "@/types/inventory";
import type { Product } from "@/types/product";

/*
 * Order placement — SERVER ONLY (called by app/api/orders/route.ts).
 *
 *   1. Ordering must be configured (delivery charges + Apps Script).
 *   2. Parse the request strictly; re-run checkout validation on the raw form.
 *   3. Rebuild every item from productService (the live catalog owns names,
 *      prices and variants): product exists & active, size / colour / design
 *      are real options, quantity is sane, current price. Browser prices,
 *      totals, names and stock are never trusted — a changed price is reported.
 *   4. Delivery charge from server config only; subtotal/total computed here.
 *   5. POST to Apps Script (URL + secret from server env). Under one lock it
 *      checks LIVE stock in the Sheets Products tab (summed per product),
 *      writes Orders + OrderItems, deducts tracked stock, logs
 *      InventoryTransactions and updates Customers, then returns the Order ID
 *      — or INSUFFICIENT_STOCK / PRODUCT_UNAVAILABLE with nothing written.
 *
 * Tracked stock is decided ONLY by Apps Script. The catalog's `stock` never
 * accepts or rejects an order, and the local JSON is never modified.
 */

const MAX_LINES = 50;
/** Sanity limit per line for products with catalog stock; live stock is enforced by Apps Script. */
const MAX_LINE_QUANTITY = 1000;
const APPS_SCRIPT_TIMEOUT_MS = 25_000;
const ORDER_ID = /^SAD-\d{8}-\d{4,}$/;

export type PlaceOrderResult = { ok: true; order: ConfirmedOrder } | { ok: false; status: number; error: OrderError };

const fail = (status: number, error: OrderError): PlaceOrderResult => ({ ok: false, status, error });

const SAVE_FAILED: OrderError = { code: "ORDER_SAVE_FAILED", message: "We couldn't save your order. Please try again." };
const STOCK_MESSAGE = "One or more items are no longer available in the requested quantity. Please review your bag.";
const UNAVAILABLE_MESSAGE = "One of the products in your order is currently unavailable.";

// ---- Request parsing -----------------------------------------------------------

const asString = (value: unknown, max = 1000) => (typeof value === "string" ? value.slice(0, max) : "");
/**
 * Option value: a string, or null when absent. Any other type is mapped to a
 * value no product has, so option validation rejects it instead of silently
 * treating it as "no option".
 */
const INVALID_OPTION = "(invalid option)";
const asOptionalString = (value: unknown) =>
  value === null || value === undefined ? null : typeof value === "string" ? value.slice(0, 100) : INVALID_OPTION;

function parseOrderRequest(body: unknown): OrderRequest | null {
  if (typeof body !== "object" || body === null) return null;
  const raw = body as Record<string, unknown>;

  if (typeof raw.requestId !== "string" || !/^[A-Za-z0-9-]{8,64}$/.test(raw.requestId)) return null;
  const mode: CheckoutMode = raw.mode === "buy-now" ? "buy-now" : "cart";

  const rawForm = (typeof raw.form === "object" && raw.form !== null ? raw.form : {}) as Record<string, unknown>;
  const form = Object.fromEntries(
    (Object.keys(EMPTY_CHECKOUT_FORM) as (keyof CheckoutFormValues)[]).map((key) => [key, asString(rawForm[key])]),
  ) as unknown as CheckoutFormValues;

  if (!Array.isArray(raw.items) || raw.items.length === 0 || raw.items.length > MAX_LINES) return null;
  const items: CheckoutDraftItem[] = [];
  for (const value of raw.items) {
    const item = (typeof value === "object" && value !== null ? value : {}) as Record<string, unknown>;
    if (typeof item.productId !== "string" || !item.productId) return null;
    if (typeof item.quantity !== "number" || typeof item.displayedUnitPrice !== "number") return null;
    items.push({
      productId: item.productId.slice(0, 64),
      size: asOptionalString(item.size),
      color: asOptionalString(item.color),
      design: asOptionalString(item.design),
      quantity: item.quantity,
      displayedUnitPrice: item.displayedUnitPrice,
    });
  }

  return { requestId: raw.requestId, mode, form, items };
}

// ---- Item re-validation --------------------------------------------------------

/** The option must be one of the product's real values; products without that option take null. */
function isValidOption(value: string | null, options: string[]): boolean {
  return options.length === 0 ? value === null : value !== null && options.includes(value);
}

async function revalidateItems(
  items: CheckoutDraftItem[],
): Promise<{ lines: ConfirmedOrderItem[]; products: Map<string, Product> } | OrderError> {
  const lines: ConfirmedOrderItem[] = [];
  const products = new Map<string, Product>();
  const invalid: string[] = [];
  const priceChanges: PriceChange[] = [];
  const catalog = new Map((await getProducts()).map(product => [product.id, product]));

  for (const item of items) {
    const product = catalog.get(item.productId); // one live catalog snapshot for all order lines
    if (!product) {
      invalid.push("An item in your order is no longer available.");
      continue;
    }
    products.set(product.id, product);

    const designLabels = product.designs.map((design) => design.label);
    if (
      !isValidOption(item.size, product.sizes) ||
      !isValidOption(item.color, product.colors) ||
      !isValidOption(item.design, designLabels)
    ) {
      invalid.push(`${product.name}: the selected options are not available.`);
      continue;
    }

    // Stock itself is checked live by Apps Script. Products without catalog stock keep the
    // storefront's per-line safety limit (maxOrderQuantity → 10); others a sanity limit.
    const lineLimit = product.stock === null ? maxOrderQuantity(product) : MAX_LINE_QUANTITY;
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > lineLimit) {
      invalid.push(`${product.name}: invalid quantity.`);
      continue;
    }

    const unitPrice = getEffectivePrice(product);
    if (unitPrice === null) {
      invalid.push(`${product.name} can't be ordered online right now.`);
      continue;
    }
    if (unitPrice !== item.displayedUnitPrice) {
      priceChanges.push({
        productId: product.id,
        size: item.size,
        color: item.color,
        design: item.design,
        name: product.name,
        previousPrice: item.displayedUnitPrice,
        currentPrice: unitPrice,
      });
    }

    lines.push({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      image: product.designs.find((design) => design.label === item.design)?.image ?? product.images[0],
      size: item.size,
      color: item.color,
      design: item.design,
      quantity: item.quantity,
      unitPrice,
      lineTotal: unitPrice * item.quantity,
    });
  }

  if (invalid.length > 0) {
    return {
      code: "INVALID_ITEMS",
      message: "Some items in your order are no longer available or have changed. Please review your bag.",
      details: invalid,
    };
  }

  if (priceChanges.length > 0) {
    return {
      code: "PRICE_CHANGED",
      message: "A product price has changed. Please review your order before trying again.",
      priceChanges,
    };
  }

  return { lines, products };
}

// ---- Apps Script -------------------------------------------------------------

type SaveResult =
  | { ok: true; orderId: string; createdAt: string }
  | { ok: false; code: "INSUFFICIENT_STOCK"; productId: string; available: number }
  | { ok: false; code: "PRODUCT_UNAVAILABLE"; productId: string }
  | { ok: false; code: "CATALOG_CHANGED"; productId: string }
  | { ok: false; code: "FAILED" };

async function saveToAppsScript(payload: Record<string, unknown>, productIds: Set<string>): Promise<SaveResult> {
  const data = await callAppsScript(payload, { timeoutMs: APPS_SCRIPT_TIMEOUT_MS, label: "orders" });
  if (!data) return { ok: false, code: "FAILED" };

  if (data.success === true && typeof data.orderId === "string" && ORDER_ID.test(data.orderId)) {
    return { ok: true, orderId: data.orderId, createdAt: typeof data.createdAt === "string" ? data.createdAt : "" };
  }
  // Stock answers are only trusted for products that are actually in this order.
  const productId = typeof data.productId === "string" && productIds.has(data.productId) ? data.productId : null;
  if (data.code === "INSUFFICIENT_STOCK" && productId) {
    const available = typeof data.available === "number" && Number.isInteger(data.available) ? Math.max(0, data.available) : 0;
    return { ok: false, code: "INSUFFICIENT_STOCK", productId, available };
  }
  if (data.code === "PRODUCT_UNAVAILABLE" && productId) return { ok: false, code: "PRODUCT_UNAVAILABLE", productId };
  if (data.code === "CATALOG_CHANGED" && productId) return { ok: false, code: "CATALOG_CHANGED", productId };

  // Log the outcome only — no payload, secret or customer details.
  console.error("[orders] Apps Script did not save the order.");
  return { ok: false, code: "FAILED" };
}

/** Apps Script stock rejection → customer-facing error, plus the live stock for the bag's warnings. */
function stockError(result: Extract<SaveResult, { ok: false }>, products: Map<string, Product>): OrderError | null {
  if (result.code === "FAILED") return null;
  if (result.code === "CATALOG_CHANGED") return { code: "INVALID_ITEMS", message: "A product changed while your order was being placed. Reopen the product page and add it to your bag again." };
  const name = products.get(result.productId)?.name ?? "An item";
  if (result.code === "PRODUCT_UNAVAILABLE") {
    const update: LiveInventoryItem = {
      productId: result.productId,
      trackStock: false,
      stock: null,
      status: "inactive",
      updatedAt: "",
    };
    return { code: "PRODUCT_UNAVAILABLE", message: UNAVAILABLE_MESSAGE, details: [`${name} is currently unavailable`], inventory: [update] };
  }
  const update: LiveInventoryItem = {
    productId: result.productId,
    trackStock: true,
    stock: result.available,
    status: "active",
    updatedAt: "",
  };
  return {
    code: "STOCK_UNAVAILABLE",
    message: STOCK_MESSAGE,
    details: [result.available === 0 ? `${name}: out of stock` : `${name}: only ${result.available} available`],
    inventory: [update],
  };
}

// ---- Entry point -------------------------------------------------------------

export async function placeOrder(body: unknown): Promise<PlaceOrderResult> {
  const status = getOrderingStatus();
  if (!status.available) return fail(503, { code: "ORDERING_UNAVAILABLE", message: status.message! });

  const request = parseOrderRequest(body);
  if (!request) return fail(400, { code: "BAD_REQUEST", message: "We couldn't read your order. Please try again." });

  const fieldErrors = validateCheckout(request.form);
  if (Object.keys(fieldErrors).length > 0) {
    return fail(400, { code: "VALIDATION_ERROR", message: "Please check your details and try again.", fieldErrors });
  }
  const details = normalizeCheckoutDetails(request.form);

  const checked = await revalidateItems(request.items);
  if ("code" in checked) return fail(checked.code === "INVALID_ITEMS" ? 400 : 409, checked);

  const deliveryCharge = getDeliveryCharge(details.delivery.deliveryArea);
  if (deliveryCharge === null) return fail(503, { code: "ORDERING_UNAVAILABLE", message: status.message ?? "" });

  const subtotal = checked.lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const discount = 0; // coupons aren't implemented yet
  const total = subtotal - discount + deliveryCharge;

  const saved = await saveToAppsScript({
    requestId: request.requestId,
    customer: details.customer,
    delivery: details.delivery,
    items: checked.lines.map((line) => ({
      productId: line.productId,
      productName: line.name,
      productSlug: line.slug,
      category: checked.products.get(line.productId)!.category,
      size: line.size,
      color: line.color,
      design: line.design,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineTotal: line.lineTotal,
    })),
    subtotal,
    deliveryCharge,
    discount,
    total,
    paymentMethod: details.paymentMethod,
    note: details.note,
  }, new Set(checked.products.keys()));

  if (!saved.ok) {
    const error = stockError(saved, checked.products);
    if (!error) return fail(502, SAVE_FAILED);
    invalidateInventoryCache(); // the display cache was out of date
    return fail(409, error);
  }
  invalidateInventoryCache(); // stock changed

  const { delivery, customer } = details;
  return {
    ok: true,
    order: {
      orderId: saved.orderId,
      createdAt: saved.createdAt,
      items: checked.lines,
      subtotal,
      deliveryCharge,
      discount,
      total,
      paymentMethod: details.paymentMethod,
      orderStatus: "Pending",
      customer: { name: customer.name, phone: customer.phone },
      delivery: {
        deliveryArea: delivery.deliveryArea,
        address: [delivery.address, delivery.area, delivery.district, delivery.division, delivery.postalCode]
          .filter(Boolean)
          .join(", "),
      },
    },
  };
}
