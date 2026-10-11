import "server-only";
import { createHash, createHmac } from "node:crypto";
import { getAppsScriptConfig } from "@/lib/delivery";
export function orderAccess(requestId: string, request: unknown) {
  const config = getAppsScriptConfig();
  if (!config) throw new Error("Ordering unavailable.");
  const signature = createHash("sha256").update(JSON.stringify(request)).digest("hex");
  const token = createHmac("sha256", config.secret).update(`sadira-order-access-v1:${requestId}:${signature}`).digest("hex");
  return { token, hash: createHash("sha256").update(token).digest("hex") };
}
export const hashAccessToken = (token: string) => createHash("sha256").update(token).digest("hex");
