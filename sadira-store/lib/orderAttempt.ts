const KEY = "sadira-order-attempt";

/** Persist only a SHA-256 signature and random ID, never customer details. */
export async function orderAttemptId(body: unknown): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(body)));
  const signature = Array.from(new Uint8Array(hash), n => n.toString(16).padStart(2, "0")).join("");
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) || "null");
    if (saved?.signature === signature && /^[a-f0-9-]{36}$/i.test(saved.id)) return saved.id;
  } catch { /* Storage can be disabled. */ }
  const id = crypto.randomUUID();
  try { sessionStorage.setItem(KEY, JSON.stringify({ signature, id, at: Date.now() })); } catch { /* In-memory guard still protects double clicks. */ }
  return id;
}

export function clearOrderAttempt() { try { sessionStorage.removeItem(KEY); } catch { /* Optional storage. */ } }
