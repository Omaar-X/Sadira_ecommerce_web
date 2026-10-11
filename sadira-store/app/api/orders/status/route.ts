import { readJsonBody, RequestBodyError } from "@/lib/requestBody";
import { hashAccessToken } from "@/lib/orderAccess";
import { callAppsScript } from "@/services/appsScript";
export const runtime = "nodejs";
export const maxDuration = 45;
const reply = (body: object, status: number) => Response.json(body, { status, headers: { "Cache-Control": "no-store", ...(status === 429 ? { "Retry-After": "60" } : {}) } });
export async function POST(request: Request) {
  let raw;
  try { raw = await readJsonBody(request, 2048); } catch (error) { return reply({ success: false, message: "Check your order ID and access code." }, error instanceof RequestBodyError ? error.status : 400); }
  const b = raw as { orderId?: unknown; token?: unknown } | null;
  if (!b || typeof b.orderId !== "string" || !/^SAD-\d{8}-\d{4,}$/.test(b.orderId) || b.orderId.length > 32 || typeof b.token !== "string" || !/^[a-f0-9]{64}$/.test(b.token)) return reply({ success: false, message: "Order not found. Check your order ID and access code." }, 404);
  const result = await callAppsScript({ action: "orderStatus", orderId: b.orderId, accessHash: hashAccessToken(b.token) }, { timeoutMs: 25000, label: "order-status" });
  if (result?.success === true && result.data) return reply({ success: true, data: result.data }, 200);
  if (result?.code === "RATE_LIMITED") return reply({ success: false, message: "Too many lookups. Try again in a minute." }, 429);
  if (!result || result.code === "BUSY") return reply({ success: false, message: "Order status is temporarily unavailable. Try again shortly." }, 503);
  return reply({ success: false, message: "Order not found. Check your order ID and access code." }, 404);
}
