"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";

/**
 * Gemeinsamer Logout für Header (`UserMenu`) und Bottom-Sheet (`MobileNav`,
 * #582) — beide müssen exakt dasselbe aufräumen.
 */
export function useSignOut() {
  const router = useRouter();

  return async function signOut() {
    await authClient.signOut();
    // #472/#339: Client-Präferenzen (Sidebar-Pin, geschlossene
    // Notification-Hinweise) sind geräte-, nicht kontogebunden — ohne das
    // hier zu räumen, würde die nächste Person am selben Gerät (auch ein
    // anderes Meeple) im zuletzt angehefteten Sidebar-Zustand starten bzw.
    // eine für die vorige Person geschlossene Notification nie mehr sehen.
    // Räumt auch die Scan-Logs (`scan-log:*`, #574) — wer das hier auf
    // einzelne Schlüssel einschränkt, muss sie ausdrücklich mitlöschen.
    localStorage.clear();
    router.push("/");
    router.refresh();
  };
}
