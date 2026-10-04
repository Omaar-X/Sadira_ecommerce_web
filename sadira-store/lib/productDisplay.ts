import { getDiscountPercentage, isOnSale } from "@/lib/pricing";
import type { BadgeVariant } from "@/components/ui/Badge";
import type { Product, PublicProduct } from "@/types/product";

/** Strips internal fields before a product is passed to a Client Component. */
export function toPublicProduct(product: Product): PublicProduct {
  const { detailsSource, ...publicFields } = product;
  void detailsSource;
  return publicFields;
}

/** Bengali text gets lang="bn" so it's read and hyphenated correctly. */
export function textLang(text: string): "bn" | undefined {
  return /[ঀ-৿]/.test(text) ? "bn" : undefined;
}

/** Stock at or below this (and above 0) counts as "low". */
export const LOW_STOCK_THRESHOLD = 5;

export interface ProductBadge {
  label: string;
  variant: BadgeVariant;
}

/** Badges derived only from real product fields — never invented. */
export function getProductBadges(
  product: Pick<Product, "price" | "salePrice" | "stock" | "newArrival">,
): ProductBadge[] {
  const badges: ProductBadge[] = [];
  if (product.newArrival) badges.push({ label: "New", variant: "dark" });
  if (isOnSale(product)) badges.push({ label: `Sale −${getDiscountPercentage(product)}%`, variant: "rose" });
  if (product.stock !== null && product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD) {
    badges.push({ label: "Low Stock", variant: "soft" });
  }
  return badges;
}

/** Short stock note, or null when stock is untracked (null) or comfortably available. */
export function getStockHint(product: Pick<Product, "stock">): string | null {
  if (product.stock === null) return null;
  if (product.stock === 0) return "Out of Stock";
  if (product.stock <= LOW_STOCK_THRESHOLD) return `Only ${product.stock} left`;
  return null;
}
