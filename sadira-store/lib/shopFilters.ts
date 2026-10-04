import { CATEGORY_GROUPS, ROUTES, type CategoryGroupSlug } from "@/lib/constants";
import { getEffectivePrice } from "@/lib/pricing";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types/product";

/*
 * Shop page query model: parsing & validating URL params, filtering, sorting
 * and building URLs. Pure functions with no data access, so the same rules run
 * on the server (the grid) and in the browser (the mobile filter drawer's counts).
 */

// ---- Options ----------------------------------------------------------------

export const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "price-high", label: "Price: High to Low" },
  { value: "name-asc", label: "Name: A–Z" },
] as const;

export type ShopSort = (typeof SORT_OPTIONS)[number]["value"];
export const DEFAULT_SORT: ShopSort = "featured";

/** Ranges chosen from the real catalog prices (৳200–৳1,999); every range has products. */
export const PRICE_RANGES = [
  { value: "under-500", min: null, max: 499, label: `Under ${formatPrice(500)}` },
  { value: "500-999", min: 500, max: 999, label: `${formatPrice(500)} – ${formatPrice(999)}` },
  { value: "1000-1499", min: 1000, max: 1499, label: `${formatPrice(1000)} – ${formatPrice(1499)}` },
  { value: "1500-plus", min: 1500, max: null, label: `${formatPrice(1500)}+` },
] as const;

export type PriceRange = (typeof PRICE_RANGES)[number]["value"];

/**
 * stock > 0 → in stock, stock === 0 → out of stock, stock === null → unknown.
 * Untracked (null) stock is never counted as in or out of stock.
 */
export const AVAILABILITY_OPTIONS = [
  { value: "in-stock", label: "In Stock" },
  { value: "out-of-stock", label: "Out of Stock" },
  { value: "unknown", label: "Availability Unknown" },
] as const;

export type Availability = (typeof AVAILABILITY_OPTIONS)[number]["value"];

// ---- Query --------------------------------------------------------------------

export interface ShopFilters {
  /** A real category slug, e.g. "abaya". Mutually exclusive with `group`. */
  category: string | null;
  /** A website group, e.g. "accessories". Mutually exclusive with `category`. */
  group: CategoryGroupSlug | null;
  price: PriceRange | null;
  availability: Availability | null;
  size: string | null;
  color: string | null;
}

export interface ShopQuery extends ShopFilters {
  q: string;
  sort: ShopSort;
}

export const EMPTY_FILTERS: ShopFilters = {
  category: null,
  group: null,
  price: null,
  availability: null,
  size: null,
  color: null,
};

/** Values the URL is validated against (derived from the real catalog). */
export interface ShopQueryContext {
  categorySlugs: readonly string[];
  sizes: readonly string[];
  colors: readonly string[];
}

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : null;
}

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | null {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

/** Turns raw URL params into a valid query; anything unknown is ignored rather than trusted. */
export function parseShopQuery(params: RawParams, context: ShopQueryContext): ShopQuery {
  const category = oneOf(first(params.category), context.categorySlugs);
  const group = category
    ? null
    : oneOf(first(params.group), Object.keys(CATEGORY_GROUPS) as CategoryGroupSlug[]);

  return {
    q: (first(params.q) ?? "").slice(0, 100),
    category,
    group,
    price: oneOf(first(params.price), PRICE_RANGES.map((range) => range.value)),
    availability: oneOf(first(params.availability), AVAILABILITY_OPTIONS.map((option) => option.value)),
    size: oneOf(first(params.size), context.sizes),
    color: oneOf(first(params.color), context.colors),
    sort: oneOf(first(params.sort), SORT_OPTIONS.map((option) => option.value)) ?? DEFAULT_SORT,
  };
}

/** Builds a /shop URL (stable param order; defaults omitted). */
export function toShopUrl(query: Partial<ShopQuery>): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.category) params.set("category", query.category);
  else if (query.group) params.set("group", query.group);
  if (query.price) params.set("price", query.price);
  if (query.availability) params.set("availability", query.availability);
  if (query.size) params.set("size", query.size);
  if (query.color) params.set("color", query.color);
  if (query.sort && query.sort !== DEFAULT_SORT) params.set("sort", query.sort);
  const search = params.toString();
  return search ? `${ROUTES.shop}?${search}` : ROUTES.shop;
}

const FILTER_KEYS = Object.keys(EMPTY_FILTERS) as (keyof ShopFilters)[];

/** Number of active filters (search and sort aren't filters). */
export function countActiveFilters(filters: ShopFilters): number {
  return FILTER_KEYS.filter((key) => filters[key] !== null).length;
}

// ---- Filtering ----------------------------------------------------------------

/** The product fields filters need — also what the browser receives for draft counts. */
export type FilterableProduct = Pick<
  Product,
  "id" | "categorySlug" | "price" | "salePrice" | "stock" | "sizes" | "colors"
>;

export function getAvailability(product: Pick<Product, "stock">): Availability {
  if (product.stock === null) return "unknown";
  return product.stock > 0 ? "in-stock" : "out-of-stock";
}

function inPriceRange(product: FilterableProduct, range: PriceRange): boolean {
  const price = getEffectivePrice(product);
  if (price === null) return false;
  const { min, max } = PRICE_RANGES.find((option) => option.value === range)!;
  return (min === null || price >= min) && (max === null || price <= max);
}

export function matchesFilters(product: FilterableProduct, filters: ShopFilters): boolean {
  if (filters.category && product.categorySlug !== filters.category) return false;
  if (filters.group) {
    const groupCategories: readonly string[] = CATEGORY_GROUPS[filters.group].categorySlugs;
    if (!groupCategories.includes(product.categorySlug)) return false;
  }
  if (filters.price && !inPriceRange(product, filters.price)) return false;
  if (filters.availability && getAvailability(product) !== filters.availability) return false;
  if (filters.size && !product.sizes.includes(filters.size)) return false;
  if (filters.color && !product.colors.includes(filters.color)) return false;
  return true;
}

export function filterProducts<T extends FilterableProduct>(products: T[], filters: ShopFilters): T[] {
  return products.filter((product) => matchesFilters(product, filters));
}

/**
 * Case-insensitive search over public product data: name, ID, category,
 * description, features, detail labels/values and colours. Every word must match.
 * Internal fields (e.g. detailsSource) are never searched.
 */
export function matchesSearch(product: Product, query: string): boolean {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = [
    product.name,
    product.id,
    product.category,
    product.description,
    ...product.features,
    ...product.details.flatMap((detail) => [detail.label, detail.value]),
    ...product.colors,
  ]
    .join(" ")
    .toLowerCase();
  return terms.every((term) => haystack.includes(term));
}

// ---- Sorting ------------------------------------------------------------------

type Sortable = Pick<Product, "name" | "price" | "salePrice" | "featured" | "newArrival">;

/** Priced products by price; products without a price always go last (never treated as ৳0). */
function byPrice(direction: 1 | -1) {
  return (a: Sortable, b: Sortable) => {
    const pa = getEffectivePrice(a);
    const pb = getEffectivePrice(b);
    if (pa === null && pb === null) return 0;
    if (pa === null) return 1;
    if (pb === null) return -1;
    return (pa - pb) * direction;
  };
}

/**
 * Returns a sorted copy. Array sort is stable, so ties keep catalog order.
 * - featured: `featured` products first, then catalog order.
 * - newest: the catalog has no real dates yet, so this is `newArrival`
 *   products first, then catalog order. Replace once real dates exist.
 */
export function sortProducts<T extends Sortable>(products: T[], sort: ShopSort): T[] {
  const sorted = [...products];
  switch (sort) {
    case "featured":
      return sorted.sort((a, b) => Number(b.featured) - Number(a.featured));
    case "newest":
      return sorted.sort((a, b) => Number(b.newArrival) - Number(a.newArrival));
    case "price-low":
      return sorted.sort(byPrice(1));
    case "price-high":
      return sorted.sort(byPrice(-1));
    case "name-asc":
      return sorted.sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
  }
}

// ---- Labels -------------------------------------------------------------------

export function pluralizeProducts(count: number): string {
  return `${count} ${count === 1 ? "Product" : "Products"}`;
}

export function priceRangeLabel(value: PriceRange): string {
  return PRICE_RANGES.find((range) => range.value === value)!.label;
}

export function availabilityLabel(value: Availability): string {
  return AVAILABILITY_OPTIONS.find((option) => option.value === value)!.label;
}
