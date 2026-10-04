import Link from "next/link";
import { getOrder, safeLoad } from "@/services/adminService";
import { Badge, DataTable, Fields, Heading, LoadError, money, transactionColumns } from "@/components/admin/Data";
import { OrderActions } from "@/components/admin/OrderActions";
export default async function OrderDetail({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const data = await safeLoad(() => getOrder(orderId));
  if (!data) return <><Heading title="Order details" description="Review the order and its audit history." /><LoadError /><Link href="/admin/orders">Back to orders</Link></>;
  const o = data.order;
  return <><Link className="admin-text-link" href="/admin/orders">← All orders</Link><Heading title={String(o.order_id)} description={`Created ${o.created_at} · Asia/Dhaka`} />
    <section className="admin-card"><div className="admin-card-title"><h2>Order summary</h2><Badge value={o.order_status} /></div><Fields record={o} fields={[["order_id", "Order ID"], ["created_at", "Created at"], ["order_status", "Status"], ["payment_method", "Payment method"], ["payment_status", "Payment status"]]} /><dl className="admin-fields" style={{ marginTop: 15 }}>{[["Subtotal", o.subtotal], ["Delivery charge", o.delivery_charge], ["Discount", o.discount], ["Total", o.total]].map(([label, value]) => <div key={String(label)}><dt>{String(label)}</dt><dd>{money(value)}</dd></div>)}</dl><div style={{ marginTop: 24 }}><OrderActions orderId={String(o.order_id)} status={String(o.order_status)} restockStatus={String(o.restock_status)} tracked={data.hasTrackedItems} /></div></section>
    <div className="admin-detail-grid"><section className="admin-card"><h2>Customer</h2><Fields record={o} fields={[["customer_name", "Name"], ["phone", "Phone"], ["alternative_phone", "Alternative phone"], ["email", "Email"]]} /></section><section className="admin-card"><h2>Delivery</h2><Fields record={o} fields={[["division", "Division"], ["district", "District"], ["area", "Area / Thana"], ["full_address", "Full address"], ["postal_code", "Postal code"], ["delivery_area", "Delivery area"], ["customer_note", "Customer note"]]} /></section></div>
    <section className="admin-card"><h2>Items</h2><DataTable rows={data.items} columns={[{ key: "product_name", label: "Product" }, { key: "product_id", label: "Product ID" }, { key: "category", label: "Category" }, ...["size", "color", "design"].filter(key => data.items.some(item => item[key])).map(key => ({ key, label: key[0].toUpperCase() + key.slice(1) })), { key: "quantity", label: "Qty" }, { key: "unit_price", label: "Unit price", render: r => money(r.unit_price) }, { key: "line_total", label: "Line total", render: r => money(r.line_total) }]} /></section>
    {o.cancel_reason && <section className="admin-card"><h2>Cancellation</h2><Fields record={o} fields={[["cancel_reason", "Reason"], ["cancelled_at", "Cancelled at"], ["restock_status", "Restock status"]]} /></section>}
    <section className="admin-card"><h2>Order History</h2><DataTable rows={data.history} columns={[{ key: "created_at", label: "Date" }, { key: "from_status", label: "From" }, { key: "to_status", label: "To" }, { key: "note", label: "Note" }, { key: "source", label: "Source" }]} empty="No controlled status changes yet." /></section>
    <section className="admin-card"><h2>Inventory transactions</h2><DataTable rows={data.transactions} columns={transactionColumns} empty="No inventory transactions for this order." /></section>
  </>;
}
