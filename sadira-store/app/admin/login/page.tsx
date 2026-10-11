import Image from "next/image";
import { redirect } from "next/navigation";
import { adminConfigured, hasAdminSession } from "@/lib/adminSession";
import { LoginForm } from "@/components/admin/LoginForm";
import logo from "@/public/brand/logo-transparent.png";
import loginImage from "@/public/catalog/abaya/sad-abaya-001/1.jpeg";
export const dynamic = "force-dynamic";
export default async function Login() {
  if (await hasAdminSession()) redirect("/admin");
  return <main className="admin-login">
    <section className="admin-login-visual" aria-hidden="true">
      <Image src={loginImage} alt="" fill priority sizes="(min-width: 900px) 55vw, 100vw" className="admin-login-photo" />
      <div className="admin-login-overlay" />
      <div className="admin-login-brand"><span>SADIRA</span><p>Modesty elevates you.</p><small>Operations workspace for orders, products and stock.</small></div>
    </section>
    <section className="admin-login-panel">
      <div className="admin-login-card">
        <Image src={logo} alt="Sadira" className="admin-login-logo" priority />
        <p className="admin-eyebrow">INTERNAL · STAFF ONLY</p>
        <h1>Welcome back.</h1>
        <p className="admin-muted">Sign in to manage orders and inventory.</p>
        <LoginForm configured={adminConfigured()} />
        <p className="admin-login-footnote">Authorized staff only</p>
      </div>
    </section>
  </main>;
}
