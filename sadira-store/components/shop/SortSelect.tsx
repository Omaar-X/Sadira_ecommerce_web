"use client";

import { useId, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { SORT_OPTIONS, toShopUrl, type ShopQuery, type ShopSort } from "@/lib/shopFilters";

/** Native select (best on mobile), styled to match; changing it updates the URL. */
export function SortSelect({ query }: { query: ShopQuery }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const id = useId();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="hidden text-sm text-muted sm:inline">
        Sort:
      </label>
      <div className="relative">
        <select
          id={id}
          value={query.sort}
          aria-label="Sort products"
          onChange={(event) =>
            startTransition(() =>
              router.push(toShopUrl({ ...query, sort: event.target.value as ShopSort }), { scroll: false }),
            )
          }
          className="h-11 max-w-[190px] cursor-pointer appearance-none rounded-full border border-line bg-white py-0 pr-9 pl-4 text-base text-foreground transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-primary-dark sm:max-w-none sm:text-sm"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted"
        />
      </div>
    </div>
  );
}
