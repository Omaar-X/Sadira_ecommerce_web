"use client";

import { Money } from "@/components/ui/Money";


import Image from "next/image";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { StockWarning } from "@/components/inventory/StockWarning";
import { useProductStock } from "@/components/inventory/useInventory";
import { QuantitySelector } from "@/components/product/QuantitySelector";
import { cartLineKey, formatCartOptions, lineTotal, maxOrderQuantity } from "@/lib/cart";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { CartItem } from "@/types/cart";

export interface CartLineProps {
  item: CartItem;
  /** "compact" in the drawer, "full" on the /cart page. */
  variant?: "compact" | "full";
}

/** One cart line: thumbnail, name, chosen options, unit price, quantity, line total, remove. */
export function CartLine({ item, variant = "compact" }: CartLineProps) {
  const { items, updateQuantity, removeItem } = useCart();
  const live = useProductStock(item.productId, item.stock);
  const key = cartLineKey(item);
  // Known stock is per product, so the product's other lines (other sizes/designs) use part of it.
  const otherLines =
    live.stock === null
      ? 0
      : items
          .filter((line) => line.productId === item.productId && cartLineKey(line) !== key)
          .reduce((sum, line) => sum + line.quantity, 0);
  // Live-aware limit; at least 1 so a sold-out line can still be shown and removed.
  const max = Math.max(1, maxOrderQuantity(item, live) - otherLines);
  const href = ROUTES.product(item.slug);
  const full = variant === "full";

  return (
    <article className="flex gap-3 sm:gap-4">
      <Link
        href={href}
        tabIndex={-1}
        aria-hidden="true"
        className={cn(
          "relative shrink-0 overflow-hidden rounded-lg border border-line bg-blush/40",
          full ? "aspect-[3/4] w-20 sm:w-28" : "aspect-[3/4] w-[4.5rem]",
        )}
      >
        <Image src={item.image} alt="" fill sizes={full ? "112px" : "72px"} className="object-cover" />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {full && (
              <p className="text-[0.6875rem] tracking-[0.14em] text-muted uppercase">{item.category}</p>
            )}
            <h3 className={cn("font-serif leading-snug", full ? "mt-0.5 text-base sm:text-lg" : "text-sm")}>
              <Link href={href} className="text-foreground transition-colors hover:text-primary-dark">
                {item.name}
              </Link>
            </h3>
          </div>
          <button
            type="button"
            aria-label={`Remove ${item.name} from bag`}
            title="Remove"
            onClick={() => removeItem(key)}
            className="-mt-1 -mr-1 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-blush hover:text-primary-dark"
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </button>
        </div>

        {formatCartOptions(item).length > 0 && (
          <dl className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
            {formatCartOptions(item).map((option) => (
              <div key={option.label} className="flex gap-1">
                <dt>{option.label}:</dt>
                <dd className="text-foreground/80">{option.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <p className="mt-1 text-xs text-muted">
          <span className="sr-only">Unit price: </span>
          <Money amount={item.price} />
          {full ? " each" : ""}
        </p>

        <StockWarning item={item} items={items} className="mt-2" />

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
          <QuantitySelector
            value={item.quantity}
            max={max}
            onChange={(quantity) => updateQuantity(key, quantity, max)}
            label={`Quantity for ${item.name}`}
            size="sm"
          />
          <p className="text-sm font-medium whitespace-nowrap text-foreground">
            <span className="sr-only">Line total: </span>
            <Money amount={lineTotal(item)} />
          </p>
        </div>
      </div>
    </article>
  );
}
