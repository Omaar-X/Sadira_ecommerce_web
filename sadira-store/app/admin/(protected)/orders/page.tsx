import { listOrders, safeLoad } from "@/services/adminService";
import { Heading, LoadError, OrdersTable, Pagination } from "@/components/admin/Data";
import { ORDER_STATUSES } from "@/services/orderOperations";
export default async function Orders({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const query = Object.fromEntries(Object.entries(raw).filter((pair): pair is [string, string] => typeof pair[1] === "string"));
  const data = await safeLoad(() => listOrders(query));
  return <><Heading title="Orders" description="Find an order, review its details, and manage the next step." /><section className="admin-card">
    <form className="admin-filters" action="/admin/orders"><label>Search orders<input name="q" placeholder="Order ID, customer or phone" maxLength={100} defaultValue={query.q} /></label><label>Status<select name="status" defaultValue={query.status || "All"}><option>All</option>{ORDER_STATUSES.map(s => <option key={s}>{s}</option>)}</select></label><label>Sort<select name="sort" defaultValue={query.sort || "newest"}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="total-high">Total high → low</option><option value="total-low">Total low → high</option></select></label><button className="admin-button primary">Apply</button></form>
    {data ? <><OrdersTable rows={data.rows} items /><Pagination data={data} base="/admin/orders" query={query} /></> : <LoadError />}
  </section></>;
}
