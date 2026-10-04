import { getLiveInventory } from "@/services/inventoryService";
import type { InventoryApiResponse } from "@/types/inventory";

/*
 * GET /api/inventory — live stock for display. The browser calls only this;
 * this server calls Apps Script (URL + secret stay server-side). Returns only
 * productId, trackStock, stock, status and updatedAt. Cached ~30 s on the
 * server; orders never rely on it (Apps Script re-checks under its lock).
 */

function respond(body: InventoryApiResponse, status: number) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  const products = await getLiveInventory();
  if (!products) return respond({ success: false }, 503);
  return respond(
    {
      success: true,
      products: products.map(({ productId, trackStock, stock, status, updatedAt }) => ({
        productId,
        trackStock,
        stock,
        status,
        updatedAt,
      })),
    },
    200,
  );
}
