import { listCustomers, safeLoad } from "@/services/adminService";
import { DataTable, Heading, LoadError, Pagination } from "@/components/admin/Data";
export default async function Customers({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams; const query = Object.fromEntries(Object.entries(raw).filter((p): p is [string, string] => typeof p[1] === "string"));
  const data = await safeLoad(() => listCustomers(query));
  return <><Heading title="Customers" description="Customer contact details supplied with their orders." /><section className="admin-card"><form className="admin-filters" action="/admin/customers"><label>Search customers<input name="q" defaultValue={query.q} placeholder="Name, phone or customer ID" maxLength={100} /></label><button className="admin-button primary">Search</button></form>{data ? <><DataTable rows={data.rows} columns={[{ key: "customer_id", label: "Customer ID" }, { key: "name", label: "Name" }, { key: "phone", label: "Phone" }, { key: "email", label: "Email" }, { key: "total_orders", label: "Total orders" }, { key: "first_order_at", label: "First order" }, { key: "last_order_at", label: "Last order" }]} empty="No customers found." /><Pagination data={data} base="/admin/customers" query={query} /></> : <LoadError />}</section></>;
}
