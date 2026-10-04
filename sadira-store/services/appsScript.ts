import { getAppsScriptConfig } from "@/lib/delivery";

/*
 * SERVER ONLY. The single place that talks to the Apps Script web app.
 * The URL and the shared secret come from server env and never reach the
 * browser; the browser only calls this site's own /api/orders and /api/inventory.
 */

/**
 * POSTs `payload` (+ the secret) and returns the parsed JSON, or null when
 * Apps Script isn't configured, can't be reached, or doesn't answer with JSON.
 * Never logs the payload, the secret or customer details.
 */
export async function callAppsScript(
  payload: Record<string, unknown>,
  { timeoutMs, label }: { timeoutMs: number; label: string },
): Promise<Record<string, unknown> | null> {
  const config = getAppsScriptConfig();
  if (!config) return null;

  try {
    // Apps Script answers POST with a redirect to the JSON output; fetch follows it.
    const response = await fetch(config.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, secret: config.secret }),
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    const data: unknown = await response.json().catch(() => null);
    if (typeof data !== "object" || data === null) {
      console.error(`[${label}] Apps Script returned no JSON (HTTP ${response.status}).`);
      return null;
    }
    return data as Record<string, unknown>;
  } catch (error) {
    console.error(`[${label}] Apps Script request failed: ${error instanceof Error ? error.name : "unknown error"}`);
    return null;
  }
}
