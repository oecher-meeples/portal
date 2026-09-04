"use client";

import type { ReactNode } from "react";
import { Sidebar, PINNED_STORAGE_KEY } from "@/components/layout/sidebar";
import { NotificationBanner } from "@/components/layout/notification-banner";
import { useLocalStorageState } from "@/components/ui/use-local-storage-state";
import { cn } from "@/lib/utils/cn";
import type { NavFlag, Tier } from "@/lib/utils/nav-config";
import type { ActiveNotification } from "@/lib/notifications/types";

/**
 * Hält den Sidebar-Pin-Zustand als einzige Quelle der Wahrheit (#471) —
 * `Sidebar` selbst und `main`s Content-Margin brauchen denselben Wert, ein
 * `useLocalStorageState`-Aufruf je Komponente würde nicht synchron bleiben
 * (`localStorage` löst kein Re-Render in anderen Komponenten aus). Bei
 * aktivem Pin wechselt `main` auf `md`/`lg` von `ml-16` auf `ml-64` — exakt
 * dieselbe Breite, die `Sidebar` dann auch tatsächlich einnimmt (Attached-
 * statt Overlay-Zustand). Ab `xl` bleibt es unverändert bei `ml-64`,
 * unabhängig vom Pin (dort ist die Sidebar ohnehin dauerhaft ausgeklappt,
 * der Pin-Button ausgeblendet).
 */
export function SidebarShell({
  tier,
  realTier,
  permissions,
  flags,
  notifications,
  children,
}: {
  tier: Tier;
  realTier: Tier;
  permissions: readonly string[];
  flags: Readonly<Record<NavFlag, boolean>>;
  notifications: ActiveNotification[];
  children: ReactNode;
}) {
  const [pinned, setPinned] = useLocalStorageState(PINNED_STORAGE_KEY, false);

  return (
    <>
      <Sidebar
        tier={tier}
        realTier={realTier}
        permissions={permissions}
        flags={flags}
        pinned={pinned}
        onTogglePinned={() => setPinned(!pinned)}
      />
      {/* pt-[5.5rem]/sm:pt-24: header (h-16 = 4rem) + the block's own py-6/sm:py-8 top inset,
          since the header is fixed and no longer pushes this block down via normal flow. */}
      {/* Width cap lives on each page now via PageContainer (#398) — routes
          differ (e.g. Ludothek uses "wide"), so AppShell no longer forces
          one globally. */}
      {/* ml folgt der Sidebar-Breite (#336, #471): < md ausgeblendet (keine
          Margin), md–lg Icon-only (w-16) außer bei aktivem Pin (dann w-64,
          Attached-Zustand), ab xl immer w-64. pb (< md): Platz für die fixed
          MobileNav-Bottom-Bar (#437), die bis exakt md sichtbar ist. */}
      <main
        className={cn(
          "min-w-0 flex-1 px-4 pt-[5.5rem] pb-20 sm:px-8 sm:pt-24 md:pb-8 xl:ml-64",
          pinned ? "md:ml-64" : "md:ml-16",
        )}
      >
        {/* #339: oberhalb der Seiten-Headline, auf jeder Seite — main ist
            der einzige Ort, durch den jede Seite läuft. */}
        <NotificationBanner notifications={notifications} />
        {children}
        {/* Scroll buffer: lets page content (e.g. a dropdown menu at the
            bottom, or the last section of a long page) scroll clear of the
            viewport bottom instead of stopping flush with it. */}
        <div aria-hidden className="h-[20vh]" />
      </main>
    </>
  );
}
