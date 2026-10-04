import "server-only";
import { createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const SESSION_SECONDS = 8 * 60 * 60;
export const ADMIN_COOKIE = process.env.NODE_ENV === "production" ? "__Host-sadira-admin" : "sadira-admin";
export const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: "/", maxAge: SESSION_SECONDS };
function config() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;
  return username && password && password.length >= 12 && secret && secret.length >= 32 ? { username, password, secret } : null;
}
export function adminConfigured() { return config() !== null; }
function equal(a: string, b: string) {
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}
export function checkCredentials(username: string, password: string) {
  const c = config();
  if (!c) return false;
  const userOk = equal(username, c.username);
  const passwordOk = equal(password, c.password);
  return userOk && passwordOk;
}
function credentialVersion(c: NonNullable<ReturnType<typeof config>>) {
  return createHmac("sha256", c.secret).update(JSON.stringify([c.username, c.password])).digest("base64url");
}
export function issueSession(now = Date.now()) {
  const c = config();
  if (!c) throw new Error("Admin access is not configured.");
  const payload = Buffer.from(JSON.stringify({ issued: now, expires: now + SESSION_SECONDS * 1000, version: credentialVersion(c), nonce: randomBytes(24).toString("base64url") })).toString("base64url");
  return payload + "." + createHmac("sha256", c.secret).update(payload).digest("base64url");
}
export function verifySession(token: string | undefined, now = Date.now()): boolean {
  const c = config();
  if (!c || !token || token.length > 1000) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const signature = createHmac("sha256", c.secret).update(parts[0]).digest("base64url");
  if (!equal(signature, parts[1])) return false;
  try {
    const p = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    return typeof p.issued === "number" && typeof p.expires === "number" && p.issued <= now && p.expires > now && p.expires - p.issued === SESSION_SECONDS * 1000 && typeof p.version === "string" && equal(p.version, credentialVersion(c));
  } catch { return false; }
}
export async function hasAdminSession() { return verifySession((await cookies()).get(ADMIN_COOKIE)?.value); }
export async function requireAdmin() { if (!await hasAdminSession()) redirect("/admin/login"); }
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const url = new URL(request.url);
  // Next.js may construct request.url with an internal hostname behind a proxy.
  // Host is the authority used by the browser; browsers cannot override it in fetch.
  const host = request.headers.get("host") || url.host;
  const protocol = process.env.NODE_ENV === "production" ? "https:" : url.protocol;
  return origin !== null && origin === `${protocol}//${host}`;
}
// Global per-process limit cannot be bypassed by spoofing forwarding headers.
// Deploy a shared edge limit when running multiple instances; see README.
const attempts: { count: number; reset: number } = { count: 0, reset: 0 };
export function consumeLoginAttempt(now = Date.now()) {
  if (now >= attempts.reset) { attempts.count = 0; attempts.reset = now + 15 * 60 * 1000; }
  if (attempts.count >= 10) return false;
  attempts.count++;
  return true;
}
