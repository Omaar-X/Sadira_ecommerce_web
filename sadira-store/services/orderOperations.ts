import "server-only";
import { callAppsScript } from "@/services/appsScript";
import { invalidateInventoryCache } from "@/services/inventoryService";

export const ORDER_STATUSES = ["Pending", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type RestockStatus = "Not Required" | "Pending" | "Restored" | "Failed";
const messages = {
  ORDER_NOT_FOUND: "Order not found.",
  INVALID_STATUS_TRANSITION: "This status change is not allowed. Use cancellation to cancel an order.",
  ORDER_ALREADY_CANCELLED: "This order is already cancelled.",
  ORDER_ALREADY_SHIPPED: "Shipped or delivered orders require a returns workflow.",
  RESTOCK_FAILED: "Restock failed. Reconcile the order and inventory before recovery.",
  INVALID_INPUT: "Provide a valid order ID and a reason between 3 and 300 characters.",
  BUSY: "Another operation is running. Please retry.",
  STATUS_UPDATE_FAILED: "Status update failed. Inspect history before retrying.",
  UNAVAILABLE: "The operational backend is unavailable. Check the order before retrying.",
} as const;
export type OperationResult =
  | { success: true; orderId: string; status: OrderStatus; restockStatus: RestockStatus }
  | { success: false; code: keyof typeof messages; message: string };
const fail = (code: keyof typeof messages): OperationResult => ({ success: false, code, message: messages[code] });
const validId = (id: string) => /^SAD-\d{8}-\d{4,}$/.test(id);
async function mutate(payload: Record<string, unknown>): Promise<OperationResult> {
  const data = await callAppsScript(payload, { timeoutMs: 60_000, label: "order-operations" });
  if (data?.success === true && data.orderId === payload.orderId && ORDER_STATUSES.includes(data.status as OrderStatus) && ["Not Required", "Pending", "Restored", "Failed"].includes(String(data.restockStatus))) {
    return { success: true, orderId: String(data.orderId), status: data.status as OrderStatus, restockStatus: data.restockStatus as RestockStatus };
  }
  const code = data?.code;
  return fail(typeof code === "string" && Object.hasOwn(messages, code) ? code as keyof typeof messages : "UNAVAILABLE");
}
// Internal services only; the Phase 13 mutation route verifies the staff session
// before invoking these functions. No direct browser/Server Action entry point.
export async function updateOrderStatus(orderId: string, newStatus: Exclude<OrderStatus, "Cancelled">, note = ""): Promise<OperationResult> {
  if (!validId(orderId) || typeof note !== "string" || note.length > 300) return fail("INVALID_INPUT");
  return mutate({ action: "updateOrderStatus", orderId, newStatus, note });
}
export async function cancelOrder(orderId: string, reason: string): Promise<OperationResult> {
  if (!validId(orderId) || typeof reason !== "string" || reason.trim().length < 3 || reason.length > 300) return fail("INVALID_INPUT");
  const result = await mutate({ action: "cancelOrder", orderId, reason });
  // Also invalidate uncertain outcomes: a transport timeout can follow a committed restock.
  invalidateInventoryCache();
  return result;
}
export async function getLowStockProducts() {
  const data = await callAppsScript({ action: "getLowStockProducts" }, { timeoutMs: 6000, label: "low-stock" });
  if (data?.success !== true || !Array.isArray(data.products)) return null;
  return data.products.flatMap((value: unknown) => {
    if (!value || typeof value !== "object") return [];
    const p = value as Record<string, unknown>;
    if (typeof p.product_id !== "string" || typeof p.product_name !== "string" || typeof p.stock !== "number" || !Number.isInteger(p.stock) || p.stock < 0 || !["Low Stock", "Out of Stock"].includes(String(p.status))) return [];
    return [{ product_id: p.product_id, product_name: p.product_name, stock: p.stock, status: String(p.status), updated_at: typeof p.updated_at === "string" ? p.updated_at : "" }];
  });
}
