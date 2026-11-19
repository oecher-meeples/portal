import type { NextConfig } from "next";
import { optimizedImageOrigins } from "./src/lib/utils/image-hosts";

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

/** Zur Build-Zeit festgelegt (standalone serialisiert die Config) — siehe
 * `image-hosts.ts` und docs/deployment-docker.md. */
const OPTIMIZED_IMAGE_ORIGINS = optimizedImageOrigins();

const nextConfig: NextConfig = {
  // Für Docker-Self-Hosting: kopiert nur die benötigten node_modules in
  // .next/standalone statt des ganzen Projekts (siehe Dockerfile).
  output: "standalone",
  // Erlaubt Zugriff auf den Dev-Server über die LAN-IP (z. B. zum Testen vom
  // Handy) – ohne das bricht die React-Hydration bei Cross-Origin-Zugriffen.
  // Bei Bedarf um die eigene LAN-IP ergänzen.
  allowedDevOrigins: ["192.168.178.100"],
  // #521: BGG-Cover (die `__original`-Datei) und S3-Uploads über den
  // Optimizer in Kartengröße statt in voller Auflösung.
  images: {
    remotePatterns: OPTIMIZED_IMAGE_ORIGINS.map(
      (origin) => new URL(`${origin}/**`),
    ),
    qualities: [75],
  },
  // Dieselbe Liste für `CoverMedia`, das alles andere `unoptimized` ausliefert.
  env: {
    NEXT_PUBLIC_OPTIMIZED_IMAGE_ORIGINS: OPTIMIZED_IMAGE_ORIGINS.join(","),
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
