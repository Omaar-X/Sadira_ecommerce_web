import { callAppsScript } from "@/services/appsScript";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{10,150}$/.test(id)) return new Response(null, { status: 404 });
  const result = await callAppsScript({ action: "catalogImage", fileId: id }, { timeoutMs: 25000, label: "catalog-image" });
  if (result?.success !== true || typeof result.data !== "string" || !["image/jpeg", "image/png", "image/webp"].includes(String(result.mime))) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  return new Response(Buffer.from(result.data, "base64"), { headers: { "Content-Type": String(result.mime), "Cache-Control": "public, max-age=86400, immutable", "X-Content-Type-Options": "nosniff" } });
}
