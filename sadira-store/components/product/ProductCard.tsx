import type { ReactNode } from "react";
import Link from "next/link";
import { LiveStockHint } from "@/components/inventory/LiveStockHint";
import { ProductCardImage } from "@/components/product/ProductCardImage";
import { ProductPrice } from "@/components/product/ProductPrice";
import { Badge } from "@/components/ui/Badge";
import { ROUTES } from "@/lib/constants";
import { getProductBadges } from "@/lib/productDisplay";
import type { Product } from "@/types/product";

export interface ProductCardProps {
  product: Product;
  /** Optional action row under the price (e.g. a future Add to Cart button). */
  action?: ReactNode;
  /** Image `sizes` matching the grid's columns; defaults to the homepage grid. */
  imageSizes?: string;
}

/**
 * Reusable product card (homepage, shop, category, search, wishlist).
 * Server-rendered; only the photo interaction and live stock note are client components.
 */
export function ProductCard({ product, action, imageSizes }: ProductCardProps) {
  const href = ROUTES.product(product.slug);
  // Stock is shown by LiveStockHint (live inventory), so the catalog-based "Low Stock" badge is left out.
  const badges = getProductBadges(product).filter((badge) => badge.label !== "Low Stock");

  return (
    <article className="group flex h-full flex-col">
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-line bg-blush/50 transition-colors duration-300 group-hover:border-primary/60">
        {/* The photo is a second route to the product; the name link below is the keyboard/screen-reader one. */}
        <Link href={href} tabIndex={-1} aria-hidden="true" className="absolute inset-0">
          <ProductCardImage name={product.name} images={product.images} sizes={imageSizes} />
          <span className="absolute inset-x-3 bottom-3 hidden justify-center [@media(hover:hover)]:flex">
            <span className="translate-y-2 rounded-full bg-white/95 px-4 py-2 text-xs font-medium tracking-wide text-foreground opacity-0 transition duration-300 ease-soft group-hover:translate-y-0 group-hover:opacity-100">
              View Product
            </span>
          </span>
        </Link>

        {badges.length > 0 && (
          <div className="pointer-events-none absolute top-2.5 left-2.5 flex flex-col items-start gap-1.5">
            {badges.map((badge) => (
              <Badge key={badge.label} variant={badge.variant}>
                {badge.label}
              </Badge>
            ))}
          </div>
        )}

      </div>

      <div className="flex flex-1 flex-col pt-3 md:pt-4">
        <p className="text-[0.6875rem] tracking-[0.14em] text-muted uppercase">{product.category}</p>
        <h3 className="mt-1 min-h-[2lh] text-sm leading-snug md:text-base">
          <Link
            href={href}
            className="line-clamp-2 font-serif text-foreground transition-colors hover:text-primary-dark"
          >
            {product.name}
          </Link>
        </h3>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <ProductPrice product={product} />
          <LiveStockHint productId={product.id} stock={product.stock} />
        </div>
        {action && <div className="mt-3">{action}</div>}
      </div>
    </article>
  );
}
