import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminConfigured, checkCredentials, consumeLoginAttempt, cookieOptions, issueSession, sameOrigin } from "@/lib/adminSession";
import { readJsonBody, RequestBodyError } from "@/lib/requestBody";
import { callAppsScript } from "@/services/appsScript";
import { getAppsScriptConfig } from "@/lib/delivery";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const respond = (message: string, status: number) => NextResponse.json({ success: false, message }, { status, headers: { "Cache-Control": "no-store" } });
  if (!sameOrigin(request)) return respond("Request not allowed.", 403);
  if (!adminConfigured()) return respond("Admin access is not configured.", 503);
  if (!consumeLoginAttempt()) return respond("Too many sign-in attempts. Try again in 15 minutes.", 429);
  let body;
  try { body = await readJsonBody(request, 4096) as { username?: unknown; password?: unknown }; } catch (error) { return respond("Invalid admin credentials.", error instanceof RequestBodyError ? error.status : 400); }
  if (getAppsScriptConfig()) {
    const limit = await callAppsScript({ action: "adminLoginLimit" }, { timeoutMs: 10000, label: "login-limit" });
    if (limit?.success !== true) return respond("Sign-in is temporarily unavailable. Check the backend deployment.", 503);
    if (limit.allowed !== true) return respond("Too many sign-in attempts. Try again in 15 minutes.", 429);
  } else if (process.env.NODE_ENV === "production") return respond("Connect the backend before enabling admin access.", 503);
  if (!body || typeof body.username !== "string" || typeof body.password !== "string" || !checkCredentials(body.username, body.password)) return respond("Invalid admin credentials.", 401);
  const response = NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(ADMIN_COOKIE, issueSession(), cookieOptions);
  return response;
}
