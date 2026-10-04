"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, ShoppingBag, Package, Layers, Users, LogOut, Menu, X } from "lucide-react";
const links = [["/admin", "Dashboard", LayoutDashboard], ["/admin/orders", "Orders", ShoppingBag], ["/admin/products", "Products", Package], ["/admin/inventory", "Inventory", Layers], ["/admin/customers", "Customers", Users]] as const;
export function AdminShell({ children }: { children: React.ReactNode }) {
  const path = usePathname(); const router = useRouter();
  const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function logout() {
    setBusy(true); setError("");
    try { const r = await fetch("/api/admin/logout", { method: "POST" }); if (!r.ok && r.status !== 401) throw Error(); router.replace("/admin/login"); router.refresh(); }
    catch { setError("Unable to sign out. Try again."); setBusy(false); }
  }
  return <div className="admin-shell">
    <aside className={`admin-sidebar ${open ? "is-open" : ""}`} id="admin-navigation">
      <Link href="/admin" className="admin-brand" onClick={() => setOpen(false)}>SADIRA<span>OPERATIONS</span></Link>
      <nav aria-label="Admin navigation">{links.map(([href, label, Icon]) => <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={(href === "/admin" ? path === href : path.startsWith(href)) ? "page" : undefined}><Icon size={18} aria-hidden="true" />{label}</Link>)}</nav>
      <button className="admin-logout" onClick={logout} disabled={busy}><LogOut size={18} aria-hidden="true" />{busy ? "Signing out..." : "Logout"}</button>
      {error && <p role="alert">{error}</p>}
      <p className="admin-sidebar-note">Sadira internal workspace</p>
    </aside>
    {open && <button className="admin-menu-backdrop" aria-label="Close navigation" onClick={() => setOpen(false)} />}
    <div className="admin-workspace"><header className="admin-header"><button className="admin-menu-button" aria-label={open ? "Close menu" : "Open menu"} aria-controls="admin-navigation" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button><span>Operations workspace</span><span className="admin-private">Internal · Asia/Dhaka</span></header><main className="admin-main">{children}</main></div>
  </div>;
}
