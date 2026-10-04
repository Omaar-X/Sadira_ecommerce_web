"use client";
import { MutationModal } from "@/components/admin/MutationModal";
const next: Record<string, [string, string]> = { Pending: ["Confirmed", "Confirm Order"], Confirmed: ["Processing", "Mark Processing"], Processing: ["Shipped", "Mark Shipped"], Shipped: ["Delivered", "Mark Delivered"] };
export function OrderActions({ orderId, status, restockStatus, tracked }: { orderId: string; status: string; restockStatus: string; tracked: boolean }) {
  if (["Pending", "Failed"].includes(restockStatus)) return <p className="admin-notice">Restock needs reconciliation. Review inventory and status history before recovery.</p>;
  const progression = next[status];
  return <div className="admin-order-actions">{progression && <MutationModal label={progression[1]} title={`Mark this order as ${progression[0]}?`} payload={{ action: "updateOrderStatus", orderId, newStatus: progression[0], note: "" }} pending="Updating..." success="Order status updated."><label>Status note (optional)<textarea name="note" maxLength={300} rows={3} /></label></MutationModal>}
  {["Pending", "Confirmed", "Processing"].includes(status) && <MutationModal label="Cancel Order" title="Cancel this order?" payload={{ action: "cancelOrder", orderId }} pending="Cancelling..." success="Order cancelled successfully." danger>{tracked && <p className="admin-notice">Tracked inventory from this order will be restored automatically.</p>}<label>Cancellation Reason<textarea name="reason" required minLength={3} maxLength={300} rows={4} /></label><p className="admin-muted">3–300 characters. This action cannot be reversed here.</p></MutationModal>}
  {!progression && !["Pending", "Confirmed", "Processing"].includes(status) && <p className="admin-muted">No normal status changes are available for this order.</p>}</div>;
}
