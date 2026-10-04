"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
export function LoginForm({ configured }: { configured: boolean }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (busy) return; const form = e.currentTarget; const values = new FormData(form); setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: values.get("username"), password: values.get("password") }) });
      const result = await response.json();
      if (!response.ok) { setError(result.message || "Unable to sign in."); setBusy(false); return; }
      form.reset(); router.replace("/admin"); router.refresh();
    } catch { setError("Unable to sign in. Try again."); setBusy(false); }
  }
  return <form onSubmit={submit} className="admin-form">
    {!configured && <p className="admin-notice" role="status">Admin access is not configured. Contact the store operator.</p>}
    <label>Username<input name="username" autoComplete="username" required maxLength={200} disabled={busy || !configured} /></label>
    <label>Password<input type="password" name="password" autoComplete="current-password" required maxLength={500} disabled={busy || !configured} /></label>
    {error && <p role="alert" className="admin-error">{error}</p>}
    <button className="admin-button primary" disabled={busy || !configured}>{busy ? "Signing in..." : "Sign In"}</button>
  </form>;
}
