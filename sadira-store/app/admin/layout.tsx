import type { Metadata } from "next";
import "./admin.css";
export const metadata: Metadata = { title: "Admin | Sadira", robots: { index: false, follow: false }, referrer: "same-origin" };
export default function AdminRoot({ children }: { children: React.ReactNode }) { return <div className="admin">{children}</div>; }
