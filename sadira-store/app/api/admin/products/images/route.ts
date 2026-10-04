import { hasAdminSession, sameOrigin } from "@/lib/adminSession";
import { MAX_IMAGE_BYTES } from "@/lib/catalogValidation";
import { callAppsScript } from "@/services/appsScript";
export const runtime = "nodejs";
export const maxDuration = 90;
const reply = (body: object, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function POST(request: Request) {
  if (!await hasAdminSession()) return reply({ success: false, message: "Sign in again to upload photos." }, 401);
  if (!sameOrigin(request)) return reply({ success: false, message: "Request not allowed." }, 403);
  const length = Number(request.headers.get("content-length") || 0);
  if (length > MAX_IMAGE_BYTES + 10000) return reply({ success: false, message: "Photo exceeds 1 MB." }, 413);
  let form;
  try { form = await request.formData(); } catch { return reply({ success: false, message: "Invalid upload." }, 400); }
  const file = form.get("image");
  const uploadKey = form.get("uploadKey");
  if (typeof uploadKey !== "string" || !/^[a-zA-Z0-9-]{16,64}$/.test(uploadKey)) return reply({ success: false, message: "Invalid upload." }, 400);
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_IMAGE_BYTES) return reply({ success: false, message: "Choose a photo up to 1 MB." }, 400);
  const bytes = Buffer.from(await file.arrayBuffer());
  const mime = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff ? "image/jpeg"
    : bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? "image/png"
    : bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP" ? "image/webp" : null;
  if (!mime) return reply({ success: false, message: "Use a JPEG, PNG or WebP photo." }, 400);
  const result = await callAppsScript({ action: "adminUploadProductImage", uploadKey, mime, data: bytes.toString("base64") }, { timeoutMs: 60000, label: "upload-product-image" });
  if (result?.success === true && typeof result.image === "string") return reply({ success: true, image: result.image });
  return reply({ success: false, message: "Photo could not be uploaded. Check Google Drive permissions and the updated Apps Script deployment." }, 502);
}
