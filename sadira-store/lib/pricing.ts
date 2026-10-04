import type { Product } from "@/types/product";

/**
 * Pure pricing rules. Kept free of data access so both Server and Client
 * Components (e.g. the cart) can import them safely.
 */

type Priced = Pick<Product, "price" | "salePrice">;

export function isOnSale(product: Priced): boolean {
  return product.price !== null && product.salePrice !== null && product.salePrice < product.price;
}

/** The price a customer pays, or null when the product has no listed price. */
export function getEffectivePrice(product: Priced): number | null {
  return isOnSale(product) ? product.salePrice : product.price;
}

/** Whole-number discount percentage, or 0 when not on sale. */
export function getDiscountPercentage(product: Priced): number {
  if (!isOnSale(product) || product.price === null || product.salePrice === null) return 0;
  return Math.round(((product.price - product.salePrice) / product.price) * 100);
}

/** Untracked stock (null) counts as available until inventory moves to Google Sheets. */
export function isInStock(product: Pick<Product, "stock">): boolean {
  return product.stock === null || product.stock > 0;
}

export interface OrderTotals {
  subtotal: number;
  deliveryCharge: number;
  discount: number;
  total: number;
}

export function calculateOrderTotals(
  lines: { unitPrice: number; quantity: number }[],
  deliveryCharge: number,
  discount = 0,
): OrderTotals {
  const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const appliedDiscount = Math.min(Math.max(discount, 0), subtotal);
  return {
    subtotal,
    deliveryCharge,
    discount: appliedDiscount,
    total: subtotal - appliedDiscount + deliveryCharge,
  };
}
