import type { ReactNode } from "react";
import { Header } from "@/components/layout/header";
import { SidebarShell } from "@/components/layout/sidebar-shell";
import { MobileNav } from "@/components/layout/mobile-nav";
import { getPreviewTier, getRealSessionTier } from "@/lib/auth/session";
import { getCurrentUser } from "@/lib/auth/server";
import { getUserPermissionKeys } from "@/lib/auth/permissions";
import { hasOpenHelperRequest } from "@/lib/events/upcoming";
import { hasActiveAusleiheShift } from "@/lib/events/shift-rights";

export async function AppShell({ children }: { children: ReactNode }) {
  const [realTier, user, openHelperRequest] = await Promise.all([
    getRealSessionTier(),
    getCurrentUser(),
    hasOpenHelperRequest(),
  ]);
  const previewTier = realTier === "admin" ? await getPreviewTier() : null;
  const tier = previewTier ?? realTier;
  // #433: activeAusleiheShift ist pro Nutzer, braucht deshalb user.id — kann
  // erst nach dem obigen Promise.all starten, läuft dafür parallel zu
  // permissions.
  const [permissions, activeAusleiheShift] = await Promise.all([
    user ? getUserPermissionKeys(user.id) : Promise.resolve([]),
    hasActiveAusleiheShift(user?.id ?? null),
  ]);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Header
        user={user ? { name: user.name } : null}
        previewTier={realTier === "admin" ? tier : undefined}
      />
      <SidebarShell
        tier={tier}
        realTier={realTier}
        permissions={permissions}
        flags={{ openHelperRequest, activeAusleiheShift }}
      >
        {children}
      </SidebarShell>
      {/* < md ersetzt MobileNav (#437) die dort ausgeblendete Sidebar — exakt
          an Sidebars md-Schwelle übergeben, sonst Navigations-Lücke
          zwischen 640–768px (keine der beiden sichtbar). */}
      <MobileNav
        tier={tier}
        realTier={realTier}
        permissions={permissions}
        flags={{ openHelperRequest, activeAusleiheShift }}
        user={user ? { name: user.name } : null}
      />
    </div>
  );
}
