"use client";

import { useProductStock } from "@/components/inventory/useInventory";
import { getStockHint } from "@/lib/productDisplay";

/**
 * Card stock note ("Out of Stock", "Only 3 left") from live inventory, with the
 * catalog stock as the server-rendered fallback. Untracked stock shows nothing.
 * The product stays listed and viewable either way.
 */
export function LiveStockHint({ productId, stock }: { productId: string; stock: number | null }) {
  const resolved = useProductStock(productId, stock);
  const hint = resolved.unavailable ? "Currently Unavailable" : getStockHint(resolved);
  return hint ? <p className="text-xs text-primary-dark">{hint}</p> : null;
}
