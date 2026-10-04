import { placeOrder } from "@/services/orderService";
import type { OrderApiResponse } from "@/types/checkout";
import { CatalogLoadError } from "@/services/catalogService";

/*
 * POST /api/orders — the browser's only way to place an order. Validation,
 * pricing and the Apps Script call all happen server-side (services/orderService).
 */

const MAX_BODY_BYTES = 64 * 1024;

// Apps Script can take a while (lock wait + Sheet writes); the call itself times out at 25 s.
export const maxDuration = 60;

function respond(body: OrderApiResponse, status: number) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) {
    return respond({ success: false, code: "BAD_REQUEST", message: "Request too large." }, 413);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return respond({ success: false, code: "BAD_REQUEST", message: "We couldn't read your order. Please try again." }, 400);
  }

  let result;
  try { result = await placeOrder(body); }
  catch (error) {
    if (error instanceof CatalogLoadError) return respond({ success: false, code: "ORDERING_UNAVAILABLE", message: "Product information is temporarily unavailable. Please try again shortly." }, 503);
    throw error;
  }
  return result.ok
    ? respond({ success: true, order: result.order }, 201)
    : respond({ success: false, ...result.error }, result.status);
}
