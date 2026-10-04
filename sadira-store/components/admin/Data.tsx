import Link from "next/link";
import type { AdminPage, AdminRecord } from "@/types/admin";
export const money = (value: unknown) => `৳${Number(value || 0).toLocaleString("en-BD")}`;
export function Badge({ value }: { value: unknown }) { return <span className="admin-badge" data-status={String(value)}>{String(value || "—")}</span>; }
export function Heading({ title, description }: { title: string; description: string }) { return <div className="admin-page-heading"><p className="admin-eyebrow">SADIRA OPERATIONS</p><h1>{title}</h1><p className="admin-muted">{description}</p></div>; }
export function LoadError() { return <div className="admin-notice" role="alert">Unable to load operational data. Check the backend configuration and refresh to try again.</div>; }
export function DataTable({ rows, columns, empty = "No records found." }: { rows: AdminRecord[]; columns: { key: string; label: string; render?: (row: AdminRecord) => React.ReactNode }[]; empty?: string }) {
  if (!rows.length) return <p className="admin-empty">{empty}</p>;
  return <div className="admin-table-scroll" tabIndex={0} role="region" aria-label="Scrollable data table"><table className="admin-table"><thead><tr>{columns.map(c => <th key={c.key} scope="col">{c.label}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={String(r.order_item_id || r.transaction_id || r.history_id || r.order_id || r.product_id || r.customer_id || i)}>{columns.map(c => <td key={c.key}>{c.render ? c.render(r) : String(r[c.key] ?? "—") || "—"}</td>)}</tr>)}</tbody></table></div>;
}
export function OrdersTable({ rows, items = false }: { rows: AdminRecord[]; items?: boolean }) {
  const columns = [{ key: "order_id", label: "Order ID", render: (r: AdminRecord) => <Link className="admin-text-link" href={`/admin/orders/${encodeURIComponent(String(r.order_id))}`}>{String(r.order_id)}</Link> }, { key: "created_at", label: "Date" }, { key: "customer_name", label: "Customer" }, { key: "phone", label: "Phone" }, ...(items ? [{ key: "items", label: "Items" }] : []), { key: "total", label: "Total", render: (r: AdminRecord) => money(r.total) }, { key: "payment_method", label: "Payment", render: (r: AdminRecord) => <>{String(r.payment_method)}<span className="admin-cell-note">{String(r.payment_status)}</span></> }, { key: "order_status", label: "Status", render: (r: AdminRecord) => <Badge value={r.order_status} /> }, { key: "view", label: "Action", render: (r: AdminRecord) => <Link href={`/admin/orders/${encodeURIComponent(String(r.order_id))}`}>View →</Link> }];
  return <DataTable rows={rows} columns={columns} empty="No orders found." />;
}
export function Pagination({ data, base, query, pageKey = "page" }: { data: AdminPage; base: string; query: Record<string, string>; pageKey?: string }) {
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const href = (page: number) => `${base}?${new URLSearchParams({ ...query, [pageKey]: String(page) })}`;
  return <nav className="admin-pagination" aria-label="Pagination"><span>{data.total} records · Page {data.page} of {pages}</span><div>{data.page > 1 && <Link href={href(data.page - 1)}>← Previous</Link>}{data.page < pages && <Link href={href(data.page + 1)}>Next →</Link>}</div></nav>;
}
export function Fields({ record, fields }: { record: AdminRecord; fields: [string, string][] }) { return <dl className="admin-fields">{fields.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{String(record[key] ?? "") || "—"}</dd></div>)}</dl>; }
export const transactionColumns = [{ key: "transaction_id", label: "Transaction ID" }, { key: "created_at", label: "Date" }, { key: "product_id", label: "Product" }, { key: "order_id", label: "Order ID" }, { key: "type", label: "Type" }, { key: "quantity", label: "Quantity", render: (r: AdminRecord) => `${Number(r.quantity) > 0 ? "+" : ""}${r.quantity}` }, { key: "stock_before", label: "Before" }, { key: "stock_after", label: "After" }, { key: "note", label: "Note" }];
