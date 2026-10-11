import { hasAdminSession, sameOrigin } from "@/lib/adminSession";
import { callAppsScript } from "@/services/appsScript";
import { invalidateInventoryCache } from "@/services/inventoryService";
import { readJsonBody, RequestBodyError } from "@/lib/requestBody";
export const runtime = "nodejs";
export const maxDuration = 60;
const reply = (body: object, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function GET(request: Request) {
  if (!await hasAdminSession()) return reply({ success: false }, 401);
  const productId = new URL(request.url).searchParams.get("productId");
  if (!productId || !/^[A-Za-z0-9-]{1,64}$/.test(productId)) return reply({ success: false }, 400);
  const result = await callAppsScript({ action: "adminGetVariants", productId }, { timeoutMs: 25000, label: "admin-variants" });
  return reply(result?.success === true ? result : { success: false, message: "Unable to load variant stock. Deploy the updated backend and refresh." }, result?.success === true ? 200 : 503);
}
export async function POST(request: Request) {
  if (!await hasAdminSession()) return reply({ success: false, message: "Sign in again." }, 401);
  if (!sameOrigin(request)) return reply({ success: false, message: "Request not allowed." }, 403);
  let body;
  try { body = await readJsonBody(request, 64000); } catch (error) { return reply({ success: false, message: "Invalid request." }, error instanceof RequestBodyError ? error.status : 400); }
  if (!body || typeof body !== "object") return reply({ success: false }, 400);
  const b = body as Record<string, unknown>;
  const result = await callAppsScript({ action: "adminSaveVariants", productId: b.productId, variants: b.variants, expectedRevision: b.expectedRevision, reason: b.reason }, { timeoutMs: 45000, label: "save-variants" });
  invalidateInventoryCache();
  if (result?.success === true) return reply({ success: true });
  const messages: Record<string, string> = { INVENTORY_CHANGED: "Stock changed. Reload before editing again.", INVALID_INPUT: "Check variant options, quantities and reason.", VARIANT_HISTORY: "Complete existing orders before enabling variant stock; keep existing variants in the matrix.", ADJUSTMENT_FAILED: "Save not confirmed. Review inventory history before retrying." };
  return reply({ success: false, message: messages[String(result?.code)] || "Unable to save variant stock. Refresh and review the current state." }, 409);
}
