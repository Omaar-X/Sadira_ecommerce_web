import Link from "next/link";
import { getDashboard, safeLoad } from "@/services/adminService";
import { Heading, LoadError, OrdersTable, money } from "@/components/admin/Data";
export default async function Dashboard() {
  const data = await safeLoad(getDashboard);
  return <><Heading title="Dashboard" description="A clear view of today’s orders and the work ahead." />{!data ? <LoadError /> : <>
    <p className="admin-muted" style={{ marginBottom: 20 }}>{data.today} · Asia/Dhaka</p>
    <div className="admin-metrics">{["Today Orders", "Today Revenue", "Pending Orders", "Confirmed Orders", "Processing Orders", "Delivered Orders", "Cancelled Orders", "Low Stock Products", "Out of Stock Products"].map(label => <div className="admin-metric" key={label}><p>{label}</p><strong>{label === "Today Revenue" ? money(data.metrics[label]) : data.metrics[label]}</strong></div>)}</div>
    <section className="admin-card"><div className="admin-card-title"><h2>Recent orders</h2><Link href="/admin/orders">View all orders →</Link></div><OrdersTable rows={data.recentOrders} /></section>
    <p className="admin-muted">Today Revenue is the total value of orders created today, excluding Cancelled orders. It is order value, rather than collected payment. Status counts cover all orders.</p>
  </>}</>;
}
