import { hasAdminSession, sameOrigin } from "@/lib/adminSession";
import { cancelOrder, updateOrderStatus, ORDER_STATUSES, type OrderStatus } from "@/services/orderOperations";
import { callAppsScript } from "@/services/appsScript";
import { invalidateInventoryCache } from "@/services/inventoryService";
import { readJsonBody, RequestBodyError } from "@/lib/requestBody";
export const runtime = "nodejs";
export const maxDuration = 90;
const respond = (body: object, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function POST(request: Request) {
  if (!await hasAdminSession()) return respond({ success: false, message: "Your session has expired. Sign in again." }, 401);
  if (!sameOrigin(request)) return respond({ success: false, message: "Request not allowed." }, 403);
  let b;
  try { b = await readJsonBody(request, 8192) as Record<string, unknown>; } catch (error) { return respond({ success: false, message: "Invalid request." }, error instanceof RequestBodyError ? error.status : 400); }
  if (!b || typeof b !== "object") return respond({ success: false, message: "Invalid request." }, 400);
  if (b.action === "adminRecordCOD") {
    const result = await callAppsScript({ action: "adminRecordCOD", orderId: b.orderId, amount: b.amount, note: b.note }, { timeoutMs: 45000, label: "record-cod" });
    return respond({ success: result?.success === true, message: result?.success === true ? "COD collection recorded." : "Collection not confirmed. Check the order and payment audit before retrying." }, result?.success === true ? 200 : 409);
  }
  if (b.action === "updateOrderStatus" && typeof b.orderId === "string" && typeof b.newStatus === "string" && ORDER_STATUSES.includes(b.newStatus as OrderStatus) && b.newStatus !== "Cancelled" && typeof b.note === "string") {
    const result = await updateOrderStatus(b.orderId, b.newStatus as Exclude<OrderStatus, "Cancelled">, b.note);
    return respond(result, result.success ? 200 : 409);
  }
  if (b.action === "cancelOrder" && typeof b.orderId === "string" && typeof b.reason === "string") {
    const result = await cancelOrder(b.orderId, b.reason);
    return respond(result, result.success ? 200 : 409);
  }
  if (typeof b.action !== "string" || !["adminAdjustStock", "adminSetProductStatus", "adminSetTracking"].includes(b.action) || typeof b.productId !== "string" || !/^[A-Za-z0-9-]{1,64}$/.test(b.productId)) return respond({ success: false, message: "Invalid request." }, 400);
  const payload = { action: b.action, productId: b.productId, stock: b.stock, reason: b.reason, status: b.status, trackStock: b.trackStock, expectedStock: b.expectedStock, expectedTracking: b.expectedTracking, expectedStatus: b.expectedStatus };
  const result = await callAppsScript(payload, { timeoutMs: 60_000, label: "admin-inventory" });
  invalidateInventoryCache();
  if (result?.success === true) return respond({ success: true });
  if (result?.code === "VARIANT_MANAGED") return respond({ success: false, message: "This product uses variant stock. Open Edit product → Stock by size, color and design." }, 409);
  const messages: Record<string, string> = { INVALID_INPUT: "Check the product, stock and reason (3–300 characters).", PRODUCT_NOT_FOUND: "Product not found.", INVENTORY_CHANGED: "This product changed. Refresh before editing again.", UNTRACKED_PRODUCT: "Enable stock tracking before adjusting stock.", ADJUSTMENT_FAILED: "Stock adjustment failed. Inspect inventory history before retrying.", BUSY: "Another operation is running. Please retry." };
  return respond({ success: false, message: messages[String(result?.code)] || "Unable to save the product. Refresh and check its current state before retrying." }, 409);
}
