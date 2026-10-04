"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShopFilterPanel } from "@/components/shop/ShopFilterPanel";
import { toShopUrl, type FilterableProduct, type ShopQuery } from "@/lib/shopFilters";
import { cn } from "@/lib/utils";
import type { ShopFilterOptions } from "@/services/productService";

export interface DesktopShopFiltersProps {
  query: ShopQuery;
  options: ShopFilterOptions;
  candidates: FilterableProduct[];
  className?: string;
}

/** Sidebar filters: each change updates the URL (so it's shareable and back/forward works). */
export function DesktopShopFilters({ query, options, candidates, className }: DesktopShopFiltersProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <aside aria-label="Product filters" aria-busy={pending} className={cn(pending && "opacity-70", className)}>
      <ShopFilterPanel
        options={options}
        candidates={candidates}
        value={query}
        onChange={(filters) =>
          startTransition(() =>
            router.push(toShopUrl({ ...filters, q: query.q, sort: query.sort }), { scroll: false }),
          )
        }
      />
    </aside>
  );
}
