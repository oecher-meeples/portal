import type { ReactNode } from "react";
import { Header } from "@/components/layout/header";
import { SidebarShell } from "@/components/layout/sidebar-shell";
import { MobileNav } from "@/components/layout/mobile-nav";
import { getRealSessionTier, resolveViewTier } from "@/lib/auth/session";
import { getCurrentUser } from "@/lib/auth/server";
import { getUserPermissionKeys } from "@/lib/auth/permissions";
import { ensureMeeple, getMeepleMembership } from "@/lib/members/meeples";
import { hasOpenHelperRequest } from "@/lib/events/upcoming";
import { hasActiveAusleiheShift } from "@/lib/events/shift-rights";
import { listActiveNotificationsForViewer } from "@/lib/notifications/queries";

export async function AppShell({ children }: { children: ReactNode }) {
  const [realTier, user, openHelperRequest] = await Promise.all([
    getRealSessionTier(),
    getCurrentUser(),
    hasOpenHelperRequest(),
  ]);
  const tier = await resolveViewTier(realTier);
  // #433: activeAusleiheShift ist pro Nutzer, braucht deshalb user.id — kann
  // erst nach dem obigen Promise.all starten, läuft dafür parallel zu
  // permissions. #465: meepleId fürs Header-Longpress-QR-Popup, ebenfalls
  // erst ab hier möglich (braucht `user`).
  const [permissions, activeAusleiheShift, meeple] = await Promise.all([
    user ? getUserPermissionKeys(user.id) : Promise.resolve([]),
    hasActiveAusleiheShift(user?.id ?? null),
    user ? ensureMeeple(user) : Promise.resolve(null),
  ]);
  // #339: Banner + Glocke teilen sich dieselbe Liste — ein Server-Lookup
  // statt je einer eigenen Query. Braucht `permissions` (Zielgruppen-Filter),
  // kann daher erst nach dem zweiten Promise.all starten.
  // #537: Ausgetretene sehen den Scanner nicht (Vier-Augen-Prinzip).
  const [notifications, membership] = await Promise.all([
    listActiveNotificationsForViewer(permissions, meeple?.id ?? null),
    meeple ? getMeepleMembership(meeple) : Promise.resolve(null),
  ]);
  const flags = {
    openHelperRequest,
    activeAusleiheShift,
    activeMembership: membership?.membershipState !== "ausgetreten",
  };

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Header
        user={user && meeple ? { name: user.name, meepleId: meeple.id } : null}
        previewTier={realTier === "admin" ? tier : undefined}
        notifications={notifications}
      />
      <SidebarShell
        tier={tier}
        realTier={realTier}
        permissions={permissions}
        flags={flags}
        notifications={notifications}
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
        flags={flags}
        user={user && meeple ? { name: user.name, meepleId: meeple.id } : null}
      />
    </div>
  );
}
