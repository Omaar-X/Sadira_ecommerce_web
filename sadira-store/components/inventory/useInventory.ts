"use client";

import { useEffect, useSyncExternalStore } from "react";
import { resolveStock, type ResolvedStock } from "@/lib/inventory";
import { ensureInventory, inventoryStore, type InventorySnapshot } from "@/lib/inventoryStore";

/**
 * Live inventory for display. Loads /api/inventory on first use and refreshes
 * (at most once a minute) when the tab regains focus. Server render and first
 * paint use the catalog stock; live values replace it once loaded.
 */
export function useInventory(): InventorySnapshot {
  const snapshot = useSyncExternalStore(
    inventoryStore.subscribe,
    inventoryStore.getSnapshot,
    inventoryStore.getServerSnapshot,
  );

  useEffect(() => {
    ensureInventory();
    const refresh = () => {
      if (document.visibilityState === "visible") ensureInventory();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return snapshot;
}

/** One product's stock: live when available, otherwise the catalog value. */
export function useProductStock(productId: string, catalogStock: number | null): ResolvedStock {
  return resolveStock(productId, catalogStock, useInventory());
}
