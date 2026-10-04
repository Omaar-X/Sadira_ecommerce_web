import { NextResponse } from "next/server";
import { ADMIN_COOKIE, cookieOptions, hasAdminSession, sameOrigin } from "@/lib/adminSession";
export async function POST(request: Request) {
  if (!await hasAdminSession()) return NextResponse.json({ success: false, message: "Sign in again." }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ success: false, message: "Request not allowed." }, { status: 403 });
  const response = NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(ADMIN_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return response;
}
