export type AdminRecord = Record<string, string | number | boolean>;
export interface AdminPage { rows: AdminRecord[]; total: number; page: number; pageSize: number }
export interface DashboardData { today: string; metrics: Record<string, number>; recentOrders: AdminRecord[]; analytics?: DashboardAnalytics }
export interface OrderDetailData { order: AdminRecord; items: AdminRecord[]; history: AdminRecord[]; transactions: AdminRecord[]; hasTrackedItems: boolean }
export interface DailyPoint { date: string; orders: number; revenue: number }
export interface TopProduct { name: string; quantity: number; revenue: number }
export interface DashboardAnalytics { daily: DailyPoint[]; topProducts: TopProduct[] }
