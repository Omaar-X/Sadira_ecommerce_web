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
