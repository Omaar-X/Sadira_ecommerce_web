import { getCatalogProducts } from "@/services/catalogService";
import { CATEGORY_GROUPS, type CategoryGroupSlug } from "@/lib/constants";
import { resolveStock } from "@/lib/inventory";
import {
  EMPTY_FILTERS,
  filterProducts,
  matchesSearch,
  parseShopQuery,
  sortProducts,
  type FilterableProduct,
  type ShopQuery,
} from "@/lib/shopFilters";
import { getCategories } from "@/services/categoryService";
import { getLiveInventoryMap } from "@/services/inventoryService";
import type { Product } from "@/types/product";

/**
 * Storefront product queries. Pages and components use these functions and
 * never read the data source directly.
 *
 * Content comes from the live Sheets catalog, with the original JSON as the
 * initial seed. When Sheets is unconfigured the original catalog is used.
 */

/** Products in catalog order (as listed in catalog/products.source.json). */

function take<T>(items: T[], limit?: number): T[] {
  return limit === undefined ? items : items.slice(0, limit);
}

async function getVisibleProducts(): Promise<Product[]> {
  return (await getCatalogProducts()).filter((product) => product.status === "active");
}

export async function getProducts(): Promise<Product[]> {
  return getVisibleProducts();
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const products = await getVisibleProducts();
  return products.find((product) => product.slug === slug) ?? null;
}

export async function getProductById(id: string): Promise<Product | null> {
  const products = await getVisibleProducts();
  return products.find((product) => product.id === id) ?? null;
}

export async function getProductsByCategory(categorySlug: string): Promise<Product[]> {
  const products = await getVisibleProducts();
  return products.filter((product) => product.categorySlug === categorySlug);
}

/** Products in a website group, e.g. "accessories" → bag, bracelet and sunglasses. */
export async function getProductsByGroup(groupSlug: string): Promise<Product[]> {
  const group = CATEGORY_GROUPS[groupSlug as CategoryGroupSlug];
  if (!group) return [];
  const categorySlugs: readonly string[] = group.categorySlugs;
  const products = await getVisibleProducts();
  return products.filter((product) => categorySlugs.includes(product.categorySlug));
}

export async function getFeaturedProducts(limit?: number): Promise<Product[]> {
  const products = await getVisibleProducts();
  return take(products.filter((product) => product.featured), limit);
}

/** Alternates between categories (catalog order) so a short list isn't all one category. */
function interleaveByCategory(products: Product[]): Product[] {
  const byCategory = new Map<string, Product[]>();
  for (const product of products) {
    byCategory.set(product.categorySlug, [...(byCategory.get(product.categorySlug) ?? []), product]);
  }
  const queues = [...byCategory.values()];
  const result: Product[] = [];
  while (queues.some((queue) => queue.length > 0)) {
    for (const queue of queues) {
      const next = queue.shift();
      if (next) result.push(next);
    }
  }
  return result;
}

/**
 * Products flagged `newArrival`. The catalog has no dates, so until any
 * product is flagged this falls back to a category-mixed pick in catalog order.
 */
export async function getNewArrivals(limit?: number): Promise<Product[]> {
  const products = await getVisibleProducts();
  const flagged = products.filter((product) => product.newArrival);
  return take(flagged.length > 0 ? flagged : interleaveByCategory(products), limit);
}

export async function searchProducts(query: string): Promise<Product[]> {
  if (!query.trim()) return [];
  const products = await getVisibleProducts();
  return products.filter((product) => matchesSearch(product, query));
}

/**
 * Products with LIVE tracked stock (Google Sheets) in place of the catalog's
 * `stock`, for display and filtering on request-time pages. Inactive products
 * count as 0 (can't be bought). Without live inventory the catalog is used.
 * Never used to accept an order — Apps Script decides that under its lock.
 */
async function withLiveStock(products: Product[]): Promise<Product[]> {
  const inventory = await getLiveInventoryMap();
  if (!inventory) return products;
  return products.map((product) => {
    const live = resolveStock(product.id, product.stock, { products: inventory });
    return { ...product, stock: live.unavailable ? 0 : live.stock };
  });
}

// ---- Shop page ------------------------------------------------------------------

export interface ShopFilterOptions {
  categories: { slug: string; name: string }[];
  groups: { slug: CategoryGroupSlug; name: string; categorySlugs: readonly string[] }[];
  /** Only values that real products have, in catalog order. Empty → no Size filter. */
  sizes: string[];
  /** Only values that real products have, in catalog order. Empty → no Color filter. */
  colors: string[];
}

export interface ShopData {
  query: ShopQuery;
  /** Matching products, filtered and sorted. */
  products: Product[];
  /** Products matching only the search, as the minimal fields the filter UI needs for counts. */
  candidates: FilterableProduct[];
  options: ShopFilterOptions;
  /** Products in the selected category/group before any other filter (0 → "coming soon"). */
  collectionTotal: number;
}

function uniqueInOrder(values: string[]): string[] {
  return [...new Set(values)];
}

/** Everything the /shop page needs, from raw (untrusted) URL params. */
export async function getShopData(params: Record<string, string | string[] | undefined>): Promise<ShopData> {
  const [products, categories] = await Promise.all([getVisibleProducts().then(withLiveStock), getCategories()]);

  const options: ShopFilterOptions = {
    categories: categories.map(({ slug, name }) => ({ slug, name })),
    groups: (Object.keys(CATEGORY_GROUPS) as CategoryGroupSlug[]).map((slug) => ({
      slug,
      name: CATEGORY_GROUPS[slug].name,
      categorySlugs: CATEGORY_GROUPS[slug].categorySlugs,
    })),
    sizes: uniqueInOrder(products.flatMap((product) => product.sizes)),
    colors: uniqueInOrder(products.flatMap((product) => product.colors)),
  };

  const query = parseShopQuery(params, {
    categorySlugs: options.categories.map((category) => category.slug),
    sizes: options.sizes,
    colors: options.colors,
  });

  const searched = products.filter((product) => matchesSearch(product, query.q));

  return {
    query,
    products: sortProducts(filterProducts(searched, query), query.sort),
    candidates: searched.map(({ id, categorySlug, price, salePrice, stock, sizes, colors }) => ({
      id,
      categorySlug,
      price,
      salePrice,
      stock,
      sizes,
      colors,
    })),
    options,
    collectionTotal: filterProducts(products, {
      ...EMPTY_FILTERS,
      category: query.category,
      group: query.group,
    }).length,
  };
}

/**
 * Up to `limit` other products: same category first, then the same website
 * group (e.g. other accessories), then the rest of the catalog. No duplicates.
 */
export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  const others = (await getVisibleProducts()).filter((candidate) => candidate.id !== product.id);
  const groupCategories = new Set<string>(
    Object.values(CATEGORY_GROUPS)
      .map((group): readonly string[] => group.categorySlugs)
      .filter((slugs) => slugs.includes(product.categorySlug))
      .flat(),
  );

  const rank = (candidate: Product) =>
    candidate.categorySlug === product.categorySlug ? 0 : groupCategories.has(candidate.categorySlug) ? 1 : 2;

  // Stable sort keeps catalog order within each rank.
  return take(
    [...others].sort((a, b) => rank(a) - rank(b)),
    limit,
  );
}
