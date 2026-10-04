import "server-only";
import { requireAdmin } from "@/lib/adminSession";
import { callAppsScript } from "@/services/appsScript";
import type { AdminPage, DashboardData, OrderDetailData } from "@/types/admin";
import { getCatalogProducts } from "@/services/catalogService";
export class AdminLoadError extends Error { constructor() { super("Unable to load operational data. Check the backend configuration and try again."); } }
export async function adminRead<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  await requireAdmin();
  const result = await callAppsScript({ ...payload, action }, { timeoutMs: 60_000, label: "admin" });
  if (!result || result.success !== true || !result.data) throw new AdminLoadError();
  return result.data as T;
}
export const getDashboard = () => adminRead<DashboardData>("adminGetDashboard");
export const listOrders = (query: Record<string, unknown>) => adminRead<AdminPage>("adminListOrders", query);
export const getOrder = (orderId: string) => adminRead<OrderDetailData>("adminGetOrder", { orderId });
export const listCustomers = (query: Record<string, unknown>) => adminRead<AdminPage>("adminListCustomers", query);
export const listTransactions = (query: Record<string, unknown>) => adminRead<AdminPage>("adminListTransactions", query);
export async function listInventory(query: Record<string, unknown>) {
  const data = await adminRead<AdminPage>("adminListInventory", query);
  const catalog = await getCatalogProducts();
  return { ...data, rows: data.rows.map(p => {
    const local = catalog.find(item => item.id === p.product_id);
    return { ...p, product_name: local?.name || p.product_name, category: local?.category || "—", slug: local?.slug || "" };
  }) };
}

export async function safeLoad<T>(read: () => Promise<T>): Promise<T | null> {
  try { return await read(); } catch (error) { if (error instanceof AdminLoadError) return null; throw error; }
}
