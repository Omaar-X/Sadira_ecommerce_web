import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import localCatalog from "@/data/products.generated.json";
import { getAppsScriptConfig } from "@/lib/delivery";
import { parseCatalogProduct } from "@/lib/catalogValidation";
import { callAppsScript } from "@/services/appsScript";
import type { Product } from "@/types/product";

export interface CatalogEntry { product: Product; revision: string }
export class CatalogLoadError extends Error {
  constructor() { super("Unable to load the live catalog. Check the Google Sheets deployment and try again."); }
}
/** Request-scoped only: price edits must be seen by checkout immediately. */
export const getCatalogEntries = cache(async (): Promise<CatalogEntry[]> => {
  const entries = new Map<string, CatalogEntry>((localCatalog as Product[]).map(product => [product.id, { product, revision: "" }]));
  if (!getAppsScriptConfig()) return [...entries.values()];
  // Read Google Sheets only for an actual request, never during the production build.
  await connection();
  const result = await callAppsScript({ action: "catalog" }, { timeoutMs: 25000, label: "catalog" });
  if (result?.success !== true || !Array.isArray(result.products)) throw new CatalogLoadError();
  for (const row of result.products) {
    const product = parseCatalogProduct(row.product);
    if (!product || typeof row.revision !== "string") throw new CatalogLoadError();
    entries.set(product.id, { product, revision: row.revision });
  }
  // Catalog visibility and live sellability are separate. Drafts/archives are
  // hidden; an inventory-unavailable legacy listing remains visible but cannot sell.
  if (result.inventory && typeof result.inventory === "object") {
    const inventory = result.inventory as Record<string, { active: boolean; trackStock: boolean; stock: number | null }>;
    for (const entry of entries.values()) {
      const live = inventory[entry.product.id];
      if (live) {
        entry.product = { ...entry.product, stock: !live.active ? 0 : live.trackStock ? live.stock ?? 0 : null };
      }
    }
  }
  return [...entries.values()];
});
export async function getCatalogProducts() { return (await getCatalogEntries()).map(entry => entry.product); }

/**
 * Display-only catalog for browsing pages, cached briefly so pages don't each wait on Google Sheets.
 * If the live Sheet can't be read, the bundled catalog is shown instead of crashing the storefront.
 * Never use this to price or accept an order: checkout reads the strict, uncached catalog.
 */
const BROWSE_TTL_MS = 30_000;
const BROWSE_FALLBACK_TTL_MS = 10_000; // an outage is cached briefly so every page doesn't wait on a failing call
let browseCache: { at: number; ttl: number; products: Product[] } | null = null;
let browseInflight: Promise<Product[]> | null = null;
let browseGeneration = 0;

/** Drop the cached browse catalog (called whenever stock, prices or products change). */
export function invalidateBrowseCatalogCache() {
  browseCache = null;
  browseInflight = null;
  browseGeneration++;
}

async function loadBrowsableProducts(): Promise<Product[]> {
  const started = browseGeneration;
  try {
    const products = await getCatalogProducts();
    // A load that started before an invalidation may be stale: return it, don't cache it.
    if (started === browseGeneration) browseCache = { at: Date.now(), ttl: BROWSE_TTL_MS, products };
    return products;
  } catch (error) {
    if (!(error instanceof CatalogLoadError)) throw error;
    console.warn("[catalog] Live catalog unavailable; showing the bundled catalog for browsing only.");
    const products = (localCatalog as Product[]).filter(product => product.status === "active");
    if (started === browseGeneration) browseCache = { at: Date.now(), ttl: BROWSE_FALLBACK_TTL_MS, products };
    return products;
  }
}

export async function getBrowsableCatalogProducts(): Promise<Product[]> {
  if (browseCache && Date.now() - browseCache.at < browseCache.ttl) return browseCache.products;
  if (!browseInflight) {
    const current = loadBrowsableProducts();
    browseInflight = current;
    void current.then(() => undefined, () => undefined).finally(() => { if (browseInflight === current) browseInflight = null; });
  }
  return browseInflight;
}
