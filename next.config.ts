import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Erlaubt Zugriff auf den Dev-Server über die LAN-IP (z. B. zum Testen vom
  // Handy) – ohne das bricht die React-Hydration bei Cross-Origin-Zugriffen.
  // Bei Bedarf um die eigene LAN-IP ergänzen.
  allowedDevOrigins: ["192.168.178.100"],
};

export default nextConfig;
