"use client";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
export function MutationModal({ label, title, children, payload, pending = "Saving...", success = "Saved successfully.", danger = false }: { label: string; title: string; children?: ReactNode; payload: Record<string, unknown>; pending?: string; success?: string; danger?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null); const router = useRouter();
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (busy) return;
    const fields = new FormData(e.currentTarget); const body = { ...payload };
    for (const [key, value] of fields) body[key] = key === "stock" ? Number(value) : value;
    if (typeof body.reason === "string" && body.reason.trim().length < 3) { setError("Enter a reason of at least 3 characters."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/mutate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (response.status === 401) { router.replace("/admin/login"); router.refresh(); return; }
      if (!response.ok || !result.success) { setError(result.message || "Unable to save. Refresh and check the current state before retrying."); return; }
      dialog.current?.close(); setMessage(success + (result.restockStatus === "Restored" ? " Stock restored." : "")); router.refresh();
    } catch { setError("Unable to save. Refresh and check the current state before retrying."); }
    finally { setBusy(false); }
  }
  return <div className="admin-mutation"><button className={`admin-button ${danger ? "danger" : ""}`} onClick={() => { setError(""); setMessage(""); dialog.current?.showModal(); }}>{label}</button>{message && <p className="admin-success" role="status">{message}</p>}
    <dialog ref={dialog} aria-label={title} className="admin-dialog" onCancel={e => { if (busy) e.preventDefault(); }}><form onSubmit={submit}><h2>{title}</h2><div className="admin-form">{children}</div>{error && <p className="admin-error" role="alert">{error}</p>}<div className="admin-dialog-actions"><button type="button" className="admin-button" disabled={busy} onClick={() => dialog.current?.close()}>Cancel</button><button className={`admin-button ${danger ? "danger" : "primary"}`} disabled={busy}>{busy ? pending : "Confirm"}</button></div></form></dialog>
  </div>;
}
