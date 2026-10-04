import { hasAdminSession, sameOrigin } from "@/lib/adminSession";
import { parseCatalogProduct } from "@/lib/catalogValidation";
import { callAppsScript } from "@/services/appsScript";
import { invalidateInventoryCache } from "@/services/inventoryService";
export const runtime = "nodejs";
export const maxDuration = 90;
const reply = (body: object, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function POST(request: Request) {
  if (!await hasAdminSession()) return reply({ success: false, message: "Sign in again to save your product." }, 401);
  if (!sameOrigin(request)) return reply({ success: false, message: "Request not allowed." }, 403);
  if (Number(request.headers.get("content-length") || 0) > 40000) return reply({ success: false, message: "Product details are too long." }, 413);
  const raw = await request.text();
  if (raw.length > 40000) return reply({ success: false, message: "Product details are too long." }, 413);
  let body;
  try { body = JSON.parse(raw); } catch { return reply({ success: false, message: "Invalid product." }, 400); }
  const product = parseCatalogProduct(body?.product);
  if (!product || product.price === null || typeof body.expectedRevision !== "string" || body.expectedRevision.length > 100 || typeof body.create !== "boolean") return reply({ success: false, message: "Check the price, photos and product details." }, 400);
  const result = await callAppsScript({ action: "adminSaveProduct", product, expectedRevision: body.expectedRevision, create: body.create }, { timeoutMs: 60000, label: "save-product" });
  invalidateInventoryCache();
  if (result?.success === true) return reply({ success: true, revision: result.revision, productId: product.id });
  const messages: Record<string, string> = { CATALOG_NOT_READY: "Run setupCatalog() in the Google Apps Script editor before saving products.", CATALOG_CHANGED: "Someone edited this product. Reload the page before saving again.", DUPLICATE_SLUG: "This page address is already used by another product.", DUPLICATE_PRODUCT: "This product already exists. Open it from the product list to edit it.", INVALID_IMAGE: "An image is not available. Upload it again.", INVALID_INPUT: "Check your product details.", BUSY: "The store is busy. Try saving again shortly.", CATALOG_RECOVERY: "This product needs reconciliation after an interrupted save. Contact the store administrator." };
  return reply({ success: false, message: messages[String(result?.code)] || "Product was not confirmed saved. Check the product list before trying again. Google Sheets must be configured with the updated script." }, 409);
}
