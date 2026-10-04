import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminConfigured, checkCredentials, consumeLoginAttempt, cookieOptions, issueSession, sameOrigin } from "@/lib/adminSession";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const respond = (message: string, status: number) => NextResponse.json({ success: false, message }, { status, headers: { "Cache-Control": "no-store" } });
  if (!sameOrigin(request)) return respond("Request not allowed.", 403);
  if (!adminConfigured()) return respond("Admin access is not configured.", 503);
  if (!consumeLoginAttempt()) return respond("Too many sign-in attempts. Try again in 15 minutes.", 429);
  if (Number(request.headers.get("content-length") || 0) > 4096) return respond("Invalid admin credentials.", 400);
  const raw = await request.text();
  if (raw.length > 4096) return respond("Invalid admin credentials.", 400);
  let body;
  try { body = JSON.parse(raw); } catch { return respond("Invalid admin credentials.", 400); }
  if (!body || typeof body.username !== "string" || typeof body.password !== "string" || !checkCredentials(body.username, body.password)) return respond("Invalid admin credentials.", 401);
  const response = NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(ADMIN_COOKIE, issueSession(), cookieOptions);
  return response;
}
