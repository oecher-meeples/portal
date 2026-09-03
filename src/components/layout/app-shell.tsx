import type { ReactNode } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { getPreviewTier, getRealSessionTier } from "@/lib/auth/session";
import { getCurrentUser } from "@/lib/auth/server";
import { getUserPermissionKeys } from "@/lib/auth/permissions";
import { hasOpenHelperRequest } from "@/lib/events/upcoming";

export async function AppShell({ children }: { children: ReactNode }) {
  const [realTier, user, openHelperRequest] = await Promise.all([
    getRealSessionTier(),
    getCurrentUser(),
    hasOpenHelperRequest(),
  ]);
  const previewTier = realTier === "admin" ? await getPreviewTier() : null;
  const tier = previewTier ?? realTier;
  const permissions = user ? await getUserPermissionKeys(user.id) : [];

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Header
        user={user ? { name: user.name } : null}
        previewTier={realTier === "admin" ? tier : undefined}
      />
      <Sidebar
        tier={tier}
        realTier={realTier}
        permissions={permissions}
        flags={{ openHelperRequest }}
      />
      {/* pt-[5.5rem]/sm:pt-24: header (h-16 = 4rem) + the block's own py-6/sm:py-8 top inset,
          since the header is fixed and no longer pushes this block down via normal flow. */}
      {/* Width cap lives on each page now via PageContainer (#398) — routes
          differ (e.g. Ludothek uses "wide"), so AppShell no longer forces
          one globally. */}
      {/* ml folgt der Sidebar-Breite (#336): < md ausgeblendet (keine Margin),
          md–lg Icon-only (w-16), ab xl volle Breite (w-64). Der Hover-/Pin-
          Ausklappzustand der Sidebar ist ein Overlay (position: fixed) und
          verschiebt diese Margin bewusst nicht. */}
      <main className="min-w-0 flex-1 px-4 pt-[5.5rem] pb-6 sm:px-8 sm:pt-24 sm:pb-8 md:ml-16 xl:ml-64">
        {children}
        {/* Scroll buffer: lets page content (e.g. a dropdown menu at the
            bottom, or the last section of a long page) scroll clear of the
            viewport bottom instead of stopping flush with it. */}
        <div aria-hidden className="h-[20vh]" />
      </main>
    </div>
  );
}
