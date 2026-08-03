import type { NextConfig } from "next";

/**
 * The CSP itself lives in src/proxy.ts (this project's Next 16 middleware
 * entry point) — it needs a fresh nonce per request, which a static header
 * list here cannot provide. These four are static and apply to every
 * response regardless of route.
 */
const SECURITY_HEADERS = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // Only the QR/EAN scanner (<CodeScanner>) needs camera access.
    value:
      "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  // Erlaubt Zugriff auf den Dev-Server über die LAN-IP (z. B. zum Testen vom
  // Handy) – ohne das bricht die React-Hydration bei Cross-Origin-Zugriffen.
  // Bei Bedarf um die eigene LAN-IP ergänzen.
  allowedDevOrigins: ["192.168.178.100"],
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
