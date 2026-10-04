import { Money } from "@/components/ui/Money";
import { isOnSale } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/product";

const sizeClasses = {
  sm: { main: "text-sm", original: "text-xs", note: "text-sm" },
  lg: { main: "text-2xl", original: "text-base", note: "text-lg" },
} as const;

export interface ProductPriceProps {
  product: Pick<Product, "price" | "salePrice">;
  /** "sm" for cards (default), "lg" for the product page. */
  size?: keyof typeof sizeClasses;
  className?: string;
}

/** "৳ 1,550"; on sale: sale price first, original struck through; no price: "Contact for Price". */
export function ProductPrice({ product, size = "sm", className }: ProductPriceProps) {
  const text = sizeClasses[size];

  if (product.price === null) {
    return <p className={cn(text.note, "text-muted", className)}>Contact for Price</p>;
  }

  if (isOnSale(product) && product.salePrice !== null) {
    return (
      <p className={cn("flex flex-wrap items-baseline gap-x-2", className)}>
        <span className="sr-only">Sale price</span>
        <span className={cn(text.main, "font-semibold whitespace-nowrap text-primary-dark")}>
          <Money amount={product.salePrice} />
        </span>
        <span className="sr-only">Regular price</span>
        <s className={cn(text.original, "whitespace-nowrap text-muted")}><Money amount={product.price} /></s>
      </p>
    );
  }

  return (
    <p className={cn(text.main, "font-medium whitespace-nowrap text-foreground", className)}>
      <Money amount={product.price} />
    </p>
  );
}
