export type InventoryStatus = "active" | "inactive";
export interface VariantStock { size: string | null; color: string | null; design: string | null; stock: number; active: boolean }

/**
 * Live stock of one product, from the Google Sheets Products tab (via
 * GET /api/inventory). Only stock and availability live there — name, price,
 * variants and images stay in the local catalog.
 */
export interface LiveInventoryItem {
  productId: string;
  /** False = stock isn't tracked (unknown — NOT zero). */
  trackStock: boolean;
  /** Units available when tracked; null when not tracked. */
  stock: number | null;
  /** "inactive" = can't be ordered right now. */
  status: InventoryStatus;
  /** Bangladesh time, "YYYY-MM-DD HH:mm:ss" ("" when unknown). */
  updatedAt: string;
  variants?: VariantStock[];
}

export type InventoryApiResponse = { success: true; products: LiveInventoryItem[] } | { success: false };
