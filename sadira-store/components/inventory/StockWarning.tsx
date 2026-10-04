"use client";

import { AlertCircle } from "lucide-react";
import { useProductStock } from "@/components/inventory/useInventory";
import { getStockWarning } from "@/lib/inventory";
import { cn } from "@/lib/utils";
import type { CartItem } from "@/types/cart";

/**
 * Bag/checkout line warning when live stock no longer covers the quantity
 * (summed across the product's variants), or the product is out of stock or
 * unavailable. Advisory only — Apps Script makes the final check at Place Order.
 */
export function StockWarning({ item, items, className }: { item: CartItem; items: CartItem[]; className?: string }) {
  const resolved = useProductStock(item.productId, item.stock);
  const warning = getStockWarning(item, items, resolved);
  if (!warning) return null;
  return (
    <p role="status" className={cn("flex gap-1.5 text-xs leading-snug text-primary-dark", className)}>
      <AlertCircle aria-hidden="true" className="mt-px size-3.5 shrink-0" />
      {warning}
    </p>
  );
}
