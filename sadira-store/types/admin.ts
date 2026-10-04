export type AdminRecord = Record<string, string | number | boolean>;
export interface AdminPage { rows: AdminRecord[]; total: number; page: number; pageSize: number }
export interface DashboardData { today: string; metrics: Record<string, number>; recentOrders: AdminRecord[] }
export interface OrderDetailData { order: AdminRecord; items: AdminRecord[]; history: AdminRecord[]; transactions: AdminRecord[]; hasTrackedItems: boolean }
