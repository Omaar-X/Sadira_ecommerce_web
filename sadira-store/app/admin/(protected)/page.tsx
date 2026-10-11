import Link from "next/link";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Ban, CheckCircle2, CircleDollarSign, Clock3, Minus, PackageCheck, PackageX, ShoppingBag, Truck } from "lucide-react";
import { getDashboard, safeLoad } from "@/services/adminService";
import { Heading, LoadError, Metric, OrdersTable, money } from "@/components/admin/Data";
import { BarList, DailyChart } from "@/components/admin/Charts";
import type { DailyPoint } from "@/types/admin";
const today = [["Today Orders", "rose", ShoppingBag], ["Today Revenue", "green", CircleDollarSign]] as const;
const pipeline = [["Pending Orders", "amber", Clock3], ["Confirmed Orders", "blue", CheckCircle2], ["Processing Orders", "violet", Truck], ["Shipped Orders", "blue", Truck], ["Delivered Orders", "green", PackageCheck], ["Cancelled Orders", "red", Ban]] as const;
const stock = [["Low Stock Products", "amber", AlertTriangle], ["Out of Stock Products", "red", PackageX]] as const;
const sum = (rows: DailyPoint[], key: "orders" | "revenue") => rows.reduce((total, row) => total + row[key], 0);

function Delta({ current, previous }: { current: number; previous: number }) {
  if (!previous) return <span className="admin-delta" data-dir="flat"><Minus size={14} aria-hidden="true" />No earlier data to compare</span>;
  const pct = Math.round(((current - previous) / previous) * 100);
  const dir = pct > 0 ? "up" : pct < 0 ? "down" : "flat";
  const Icon = dir === "up" ? ArrowUpRight : dir === "down" ? ArrowDownRight : Minus;
  return <span className="admin-delta" data-dir={dir}><Icon size={14} aria-hidden="true" />{pct > 0 ? "+" : ""}{pct}% vs previous 7 days</span>;
}
function Stat({ label, value, current, previous }: { label: string; value: string; current: number; previous: number }) {
  return <div className="admin-stat"><p>{label}</p><strong>{value}</strong><Delta current={current} previous={previous} /></div>;
}

export default async function Dashboard() {
  const data = await safeLoad(getDashboard);
  const analytics = data?.analytics;
  const recent = analytics?.daily.slice(7) ?? [], earlier = analytics?.daily.slice(0, 7) ?? [];
  const revenue = sum(recent, "revenue"), prevRevenue = sum(earlier, "revenue"), orders = sum(recent, "orders"), prevOrders = sum(earlier, "orders");
  const aov = orders ? Math.round(revenue / orders) : 0, prevAov = prevOrders ? Math.round(prevRevenue / prevOrders) : 0;
  return <><Heading title="Dashboard" description="A clear view of today’s orders and the work ahead." />{!data ? <LoadError /> : <>
    <p className="admin-date">{data.today} · Asia/Dhaka</p>
    <div className="admin-metrics admin-metrics-hero">{today.map(([label, tone, icon]) => <Metric key={label} label={label} tone={tone} icon={icon} value={label === "Today Revenue" ? money(data.metrics[label]) : data.metrics[label]} />)}</div>
    <section className="admin-card"><h2>Recorded COD collections · all time</h2><p className="admin-stat"><strong>{money(data.metrics["Collected COD"] ?? 0)}</strong></p><p className="admin-muted">Full amounts explicitly recorded as received by staff. Order value and delivery status do not confirm collection.</p></section>

    <h2 className="admin-section-title">Performance · last 7 days</h2>
    {!analytics ? <div className="admin-notice" role="status">Charts need the latest Apps Script. In the Google Apps Script editor, paste the updated <code>Code.gs</code>, then choose Deploy → Manage deployments → Edit → New version → Deploy.</div> : <>
      <div className="admin-stats"><Stat label="Revenue" value={money(revenue)} current={revenue} previous={prevRevenue} /><Stat label="Orders" value={String(orders)} current={orders} previous={prevOrders} /><Stat label="Average order value" value={money(aov)} current={aov} previous={prevAov} /></div>
      <div className="admin-chart-grid2">
        <section className="admin-card"><div className="admin-card-title"><h2>Revenue per day</h2><span className="admin-chart-sub">Last 14 days</span></div><DailyChart data={analytics.daily} field="revenue" kind="line" label="Revenue" money color="#8f3b58" /></section>
        <section className="admin-card"><div className="admin-card-title"><h2>Orders per day</h2><span className="admin-chart-sub">Last 14 days</span></div><DailyChart data={analytics.daily} field="orders" kind="columns" label="Orders" color="#3f74b0" /></section>
      </div>
      <p className="admin-footnote" style={{ marginTop: -8, marginBottom: 24 }}>Daily charts exclude Cancelled orders and use Asia/Dhaka dates.</p>
    </>}

    <div className="admin-chart-grid2">
      <section className="admin-card"><h2>Orders by status</h2><BarList items={pipeline.map(([label]) => ({ label: label.replace(" Orders", ""), value: data.metrics[label] ?? 0 }))} empty="No orders yet." /></section>
      <section className="admin-card"><h2>Best-selling products</h2>{analytics ? <BarList items={analytics.topProducts.map(p => ({ label: p.name, value: p.quantity, note: ` sold · ${money(p.revenue)}` }))} empty="No sales yet." /> : <p className="admin-empty">Available after the Apps Script update.</p>}</section>
    </div>

    <h2 className="admin-section-title">Order pipeline</h2>
    <div className="admin-metrics admin-metrics-pipeline">{pipeline.map(([label, tone, icon]) => <Metric key={label} label={label} tone={tone} icon={icon} value={data.metrics[label]} />)}</div>
    <h2 className="admin-section-title">Stock alerts</h2>
    <div className="admin-metrics admin-metrics-stock">{stock.map(([label, tone, icon]) => <Metric key={label} label={label} tone={tone} icon={icon} value={data.metrics[label]} />)}</div>
    <section className="admin-card"><div className="admin-card-title"><h2>Recent orders</h2><Link href="/admin/orders">View all orders →</Link></div><OrdersTable rows={data.recentOrders} /></section>
    <p className="admin-footnote">Today Revenue is the total value of orders created today, excluding Cancelled orders. It is order value, rather than collected payment. Status counts cover all orders.</p>
  </>}</>;
}
