"use client";

import { useId, type ReactNode } from "react";
import {
  AVAILABILITY_OPTIONS,
  PRICE_RANGES,
  filterProducts,
  type FilterableProduct,
  type ShopFilters,
} from "@/lib/shopFilters";
import { cn } from "@/lib/utils";
import type { ShopFilterOptions } from "@/services/productService";

export interface ShopFilterPanelProps {
  options: ShopFilterOptions;
  /** Products matching the current search; used to count each option. */
  candidates: FilterableProduct[];
  value: ShopFilters;
  onChange: (next: ShopFilters) => void;
  className?: string;
}

/**
 * Controlled filter controls (radio groups). Used live in the desktop sidebar
 * and as a draft in the mobile drawer. Each option shows how many products it
 * would give with the other current selections.
 */
export function ShopFilterPanel({ options, candidates, value, onChange, className }: ShopFilterPanelProps) {
  const id = useId();
  const count = (change: Partial<ShopFilters>) => filterProducts(candidates, { ...value, ...change }).length;
  const set = (change: Partial<ShopFilters>) => onChange({ ...value, ...change });

  const groupedSlugs = new Set(options.groups.flatMap((group) => group.categorySlugs));
  const standalone = options.categories.filter((category) => !groupedSlugs.has(category.slug));
  const categoryName = (slug: string) => options.categories.find((category) => category.slug === slug)?.name ?? slug;

  return (
    // Its own form so radio groups never link up with another panel on the page.
    <form onSubmit={(event) => event.preventDefault()} className={cn("divide-y divide-line", className)}>
      <FilterGroup legend="Category">
        <Option
          name={`${id}-category`}
          label="All Products"
          checked={!value.category && !value.group}
          count={count({ category: null, group: null })}
          onSelect={() => set({ category: null, group: null })}
          alwaysEnabled
        />
        {standalone.map((category) => (
          <Option
            key={category.slug}
            name={`${id}-category`}
            label={category.name}
            checked={value.category === category.slug}
            count={count({ category: category.slug, group: null })}
            onSelect={() => set({ category: category.slug, group: null })}
            alwaysEnabled
          />
        ))}
        {options.groups.map((group) => (
          <div key={group.slug}>
            <Option
              name={`${id}-category`}
              label={group.name}
              checked={value.group === group.slug}
              count={count({ category: null, group: group.slug })}
              onSelect={() => set({ category: null, group: group.slug })}
              alwaysEnabled
            />
            <div className="ml-6 border-l border-line pl-3">
              {group.categorySlugs.map((slug) => (
                <Option
                  key={slug}
                  name={`${id}-category`}
                  label={categoryName(slug)}
                  checked={value.category === slug}
                  count={count({ category: slug, group: null })}
                  onSelect={() => set({ category: slug, group: null })}
                  alwaysEnabled
                />
              ))}
            </div>
          </div>
        ))}
      </FilterGroup>

      <FilterGroup legend="Price">
        <Option
          name={`${id}-price`}
          label="Any Price"
          checked={!value.price}
          onSelect={() => set({ price: null })}
          alwaysEnabled
        />
        {PRICE_RANGES.map((range) => (
          <Option
            key={range.value}
            name={`${id}-price`}
            label={range.label}
            checked={value.price === range.value}
            count={count({ price: range.value })}
            onSelect={() => set({ price: range.value })}
          />
        ))}
      </FilterGroup>

      <FilterGroup legend="Availability">
        <Option
          name={`${id}-availability`}
          label="All"
          checked={!value.availability}
          onSelect={() => set({ availability: null })}
          alwaysEnabled
        />
        {AVAILABILITY_OPTIONS.map((option) => (
          <Option
            key={option.value}
            name={`${id}-availability`}
            label={option.label}
            checked={value.availability === option.value}
            count={count({ availability: option.value })}
            onSelect={() => set({ availability: option.value })}
          />
        ))}
      </FilterGroup>

      {options.sizes.length > 0 && (
        <FilterGroup legend="Size">
          <Option
            name={`${id}-size`}
            label="Any Size"
            checked={!value.size}
            onSelect={() => set({ size: null })}
            alwaysEnabled
          />
          {options.sizes.map((size) => (
            <Option
              key={size}
              name={`${id}-size`}
              label={size}
              checked={value.size === size}
              count={count({ size })}
              onSelect={() => set({ size })}
            />
          ))}
        </FilterGroup>
      )}

      {options.colors.length > 0 && (
        <FilterGroup legend="Color">
          <Option
            name={`${id}-color`}
            label="Any Color"
            checked={!value.color}
            onSelect={() => set({ color: null })}
            alwaysEnabled
          />
          {options.colors.map((color) => (
            <Option
              key={color}
              name={`${id}-color`}
              label={color}
              checked={value.color === color}
              count={count({ color })}
              onSelect={() => set({ color })}
            />
          ))}
        </FilterGroup>
      )}
    </form>
  );
}

function FilterGroup({ legend, children }: { legend: string; children: ReactNode }) {
  // Spacing lives on the wrapper: padding on a <fieldset> would sit *below* its legend.
  return (
    <div className="py-5 first:pt-0 last:pb-0">
      <fieldset>
        <legend className="mb-3 text-[0.6875rem] font-medium tracking-[0.2em] text-foreground uppercase">
          {legend}
        </legend>
        <div className="flex flex-col">{children}</div>
      </fieldset>
    </div>
  );
}

interface OptionProps {
  name: string;
  label: string;
  checked: boolean;
  count?: number;
  onSelect: () => void;
  /** Keep selectable even with 0 results (e.g. a category that is coming soon). */
  alwaysEnabled?: boolean;
}

function Option({ name, label, checked, count, onSelect, alwaysEnabled = false }: OptionProps) {
  const disabled = !alwaysEnabled && !checked && count === 0;
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-md py-1.5 text-sm transition-colors",
        checked ? "font-medium text-foreground" : "text-foreground/80 hover:text-primary-dark",
        disabled && "cursor-not-allowed opacity-45 hover:text-foreground/80",
      )}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onSelect}
        className="size-4 shrink-0 accent-primary-dark"
      />
      <span className="flex-1">{label}</span>
      {count !== undefined && <span className="text-xs text-muted tabular-nums">{count}</span>}
    </label>
  );
}
