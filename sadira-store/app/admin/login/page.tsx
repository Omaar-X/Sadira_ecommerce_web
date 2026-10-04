import { redirect } from "next/navigation";
import { adminConfigured, hasAdminSession } from "@/lib/adminSession";
import { LoginForm } from "@/components/admin/LoginForm";
export const dynamic = "force-dynamic";
export default async function Login() {
  if (await hasAdminSession()) redirect("/admin");
  return <main className="admin-login"><div className="admin-login-card"><p className="admin-eyebrow">SADIRA · INTERNAL</p><h1>Welcome back.</h1><p className="admin-muted">Sign in to manage orders and inventory.</p><LoginForm configured={adminConfigured()} /><p className="admin-login-footnote">Authorized staff only</p></div></main>;
}
