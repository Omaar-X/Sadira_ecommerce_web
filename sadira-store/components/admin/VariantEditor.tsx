"use client";
import { useState } from "react";
import type { Product } from "@/types/product";
import type { VariantStock } from "@/types/inventory";
const key = (v: Pick<VariantStock, "size" | "color" | "design">) => JSON.stringify([v.size, v.color, v.design]);
export function VariantEditor({ product }: { product: Product }) {
  const [variants, setVariants] = useState<VariantStock[] | null>(null);
  const [revision, setRevision] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function load() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/products/variants?productId=${encodeURIComponent(product.id)}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Sign in again or check the backend.");
      const existing = result.data.variants as VariantStock[];
      const next = [...existing];
      for (const size of product.sizes.length ? product.sizes : [null]) for (const color of product.colors.length ? product.colors : [null]) for (const design of product.designs.length ? product.designs.map(d => d.label) : [null]) {
        const v = { size, color, design, stock: 0, active: true };
        if (!next.some(current => key(current) === key(v))) next.push(v);
        if (next.length > 100) throw new Error("More than 100 combinations. Reduce product options before enabling variant stock.");
      }
      setVariants(next); setRevision(result.data.revision);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to load."); }
    finally { setBusy(false); }
  }
  async function save() {
    if (!variants || busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/products/variants", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: product.id, variants, expectedRevision: revision, reason }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message);
      setVariants(null); setReason(""); setMessage("Variant stock saved. Reload to see current quantities.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Save not confirmed. Reload before retrying."); }
    finally { setBusy(false); }
  }
  return <section className="admin-card admin-form"><h2>Stock by size, color and design</h2><p className="admin-muted">Enabling this replaces total stock with the sum of real variant counts. Enter physical counts; zero means unavailable. Complete existing orders before first-time setup. Afterwards use this section for stock changes.</p>
    <button className="admin-button" type="button" disabled={busy} onClick={load}>{busy ? "Please wait…" : "Load / reload variants"}</button>
    {variants && <><div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Size / Color / Design</th><th>Stock</th><th>Available</th></tr></thead><tbody>{variants.map((v, index) => <tr key={key(v)}><td>{[v.size, v.color, v.design].filter(Boolean).join(" / ") || "Default"}</td><td><input aria-label={`Stock for ${[v.size, v.color, v.design].filter(Boolean).join(" / ") || "Default"}`} type="number" min={0} step={1} value={Number.isNaN(v.stock) ? "" : v.stock} disabled={busy} onChange={e => setVariants(current => current!.map((r, i) => i === index ? { ...r, stock: e.target.value === "" ? NaN : Number(e.target.value) } : r))} /></td><td><input aria-label={`Available ${[v.size, v.color, v.design].filter(Boolean).join(" / ") || "Default"}`} type="checkbox" checked={v.active} disabled={busy} onChange={e => setVariants(current => current!.map((r, i) => i === index ? { ...r, active: e.target.checked } : r))} /></td></tr>)}</tbody></table></div>
      <label>Stock adjustment reason<textarea value={reason} disabled={busy} onChange={e => setReason(e.target.value)} minLength={3} maxLength={300} /></label><button className="admin-button primary" type="button" disabled={busy || reason.trim().length < 3 || variants.some(v => !Number.isSafeInteger(v.stock) || v.stock < 0)} onClick={save}>Save variant counts</button></>}
    {message && <p role="status">{message}</p>}
  </section>;
}
