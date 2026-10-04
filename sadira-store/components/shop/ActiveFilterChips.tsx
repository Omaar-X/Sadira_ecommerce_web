import Link from "next/link";
import { X } from "lucide-react";
import {
  availabilityLabel,
  countActiveFilters,
  priceRangeLabel,
  toShopUrl,
  type ShopQuery,
} from "@/lib/shopFilters";
import type { ShopFilterOptions } from "@/services/productService";

interface Chip {
  label: string;
  href: string;
}

/** Removable chips for each active filter, plus "Clear All" (keeps the search and sort). */
export function ActiveFilterChips({ query, options }: { query: ShopQuery; options: ShopFilterOptions }) {
  if (countActiveFilters(query) === 0) return null;

  const without = (change: Partial<ShopQuery>) => toShopUrl({ ...query, ...change });
  const chips: Chip[] = [];

  if (query.category) {
    const name = options.categories.find((category) => category.slug === query.category)?.name;
    chips.push({ label: name ?? query.category, href: without({ category: null }) });
  }
  if (query.group) {
    const name = options.groups.find((group) => group.slug === query.group)?.name;
    chips.push({ label: name ?? query.group, href: without({ group: null }) });
  }
  if (query.price) chips.push({ label: priceRangeLabel(query.price), href: without({ price: null }) });
  if (query.availability) {
    chips.push({ label: availabilityLabel(query.availability), href: without({ availability: null }) });
  }
  if (query.size) chips.push({ label: `Size ${query.size}`, href: without({ size: null }) });
  if (query.color) chips.push({ label: query.color, href: without({ color: null }) });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="sr-only">Active filters:</span>
      {chips.map((chip) => (
        <Link
          key={chip.label}
          href={chip.href}
          scroll={false}
          aria-label={`Remove filter: ${chip.label}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white py-1 pr-2 pl-3 text-xs text-foreground transition-colors hover:border-primary hover:text-primary-dark"
        >
          {chip.label}
          <X aria-hidden="true" className="size-3.5" />
        </Link>
      ))}
      <Link
        href={toShopUrl({ q: query.q, sort: query.sort })}
        scroll={false}
        className="ml-1 text-xs font-medium text-foreground underline decoration-foreground/30 underline-offset-4 transition-colors hover:text-primary-dark hover:decoration-primary-dark"
      >
        Clear All
      </Link>
    </div>
  );
}
