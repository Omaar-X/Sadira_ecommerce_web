"use client";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Money } from "@/components/ui/Money";
interface Status { orderId: string; status: string; paymentStatus: string; total: number; createdAt: string; updatedAt: string }
export function OrderTracking() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status | null>(null);
  async function lookup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (busy) return;
    const form = new FormData(e.currentTarget);
    setBusy(true); setMessage(""); setStatus(null);
    try {
      const response = await fetch("/api/orders/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: String(form.get("orderId")).trim().toUpperCase(), token: String(form.get("token")).trim() }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message);
      setStatus(result.data);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to load order status."); }
    finally { setBusy(false); }
  }
  return <div className="mx-auto max-w-xl"><h1 className="text-3xl">Track your order</h1><p className="mt-3 text-sm text-muted">Use the order ID and private access code from your confirmation. Keep your access code private. Older orders may require contacting Sadira.</p><form onSubmit={lookup} className="mt-6 grid gap-5">
    <label className="grid gap-2 text-sm">Order ID<input className="rounded-xl border border-line bg-white p-3" name="orderId" required maxLength={32} placeholder="SAD-20261010-0001" autoComplete="off" /></label>
    <label className="grid gap-2 text-sm">Private access code<input className="rounded-xl border border-line bg-white p-3" name="token" type="password" required minLength={64} maxLength={64} autoComplete="off" spellCheck={false} /></label>
    <Button type="submit" disabled={busy}>{busy ? "Checking…" : "Check order status"}</Button>
  </form>{message && <p role="alert" className="mt-4 text-sm">{message}</p>}{status && <section aria-live="polite" className="mt-6 rounded-xl border border-line bg-white p-5"><h2 className="text-xl">{status.status}</h2><dl className="mt-3 grid gap-3 text-sm"><div><dt>Order</dt><dd>{status.orderId}</dd></div><div><dt>Payment status</dt><dd>{status.paymentStatus}</dd></div><div><dt>Total</dt><dd><Money amount={status.total} /></dd></div><div><dt>Last updated · Asia/Dhaka</dt><dd>{status.updatedAt || status.createdAt}</dd></div></dl></section>}</div>;
}
