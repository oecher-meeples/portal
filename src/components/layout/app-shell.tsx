import type { ReactNode } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { getPreviewTier, getRealSessionTier } from "@/lib/auth/session";
import { getCurrentUser } from "@/lib/auth/server";

export async function AppShell({ children }: { children: ReactNode }) {
  const [realTier, user] = await Promise.all([
    getRealSessionTier(),
    getCurrentUser(),
  ]);
  const previewTier = realTier === "admin" ? await getPreviewTier() : null;
  const tier = previewTier ?? realTier;

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Header
        user={user ? { name: user.name } : null}
        previewTier={realTier === "admin" ? tier : undefined}
      />
      <Sidebar tier={tier} />
      {/* pt-[5.5rem]/sm:pt-24: header (h-16 = 4rem) + the block's own py-6/sm:py-8 top inset,
          since the header is fixed and no longer pushes this block down via normal flow. */}
      <main className="min-w-0 flex-1 px-4 pt-[5.5rem] pb-6 sm:ml-64 sm:px-8 sm:pt-24 sm:pb-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          {children}
        </div>
      </main>
    </div>
  );
}
