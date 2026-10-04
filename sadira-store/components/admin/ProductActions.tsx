"use client";
import type { AdminRecord } from "@/types/admin";
import { MutationModal } from "@/components/admin/MutationModal";
export function ProductActions({ product, stockOnly = false }: { product: AdminRecord; stockOnly?: boolean }) {
  const tracked = product.track_stock === true;
  const expected = { productId: product.product_id, expectedStock: typeof product.stock === "number" ? product.stock : null, expectedTracking: tracked, expectedStatus: product.status };
  if (product.recovery_required) return <span className="admin-error">Needs reconciliation</span>;
  return <div className="admin-inline-actions">
    {tracked && <MutationModal label={stockOnly ? "Adjust Stock" : "Set Stock"} title={`Adjust ${product.product_name} stock`} payload={{ action: "adminAdjustStock", ...expected }} success="Stock adjusted."><label>New stock<input name="stock" type="number" min={0} max={Number.MAX_SAFE_INTEGER} step={1} defaultValue={Number(product.stock || 0)} required /></label><label>Adjustment reason<textarea name="reason" rows={3} required minLength={3} maxLength={300} /></label><p className="admin-muted">Current stock: {String(product.stock)}. Changes are recorded in inventory history.</p></MutationModal>}
    {!stockOnly && <><MutationModal label={product.status === "active" ? "Set Inactive" : "Set Active"} title={`Set ${product.product_name} ${product.status === "active" ? "inactive" : "active"}?`} payload={{ action: "adminSetProductStatus", ...expected, status: product.status === "active" ? "inactive" : "active" }} success="Product status updated."><p>Availability will update in the storefront.</p></MutationModal>
    <MutationModal label={tracked ? "Tracking Off" : "Tracking On"} title={`${tracked ? "Disable" : "Enable"} stock tracking?`} payload={{ action: "adminSetTracking", ...expected, trackStock: !tracked }} success="Stock tracking updated.">{!tracked && <label>Initial stock<input name="stock" type="number" min={0} max={Number.MAX_SAFE_INTEGER} step={1} required /></label>}<label>Reason<textarea name="reason" required minLength={3} maxLength={300} rows={3} /></label><p className="admin-muted">Existing inventory history is preserved.</p></MutationModal></>}
  </div>;
}
