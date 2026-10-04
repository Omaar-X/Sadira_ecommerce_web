import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  devIndicators: false,
  async headers() {
    const headers = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'" },
      { key: "Referrer-Policy", value: "same-origin" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Cache-Control", value: "private, no-store" },
    ];
    return [{ source: "/admin/:path*", headers }, { source: "/api/admin/:path*", headers }];
  },
};
export default nextConfig;
