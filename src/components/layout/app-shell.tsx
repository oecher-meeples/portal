import type { ReactNode } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { getPreviewTier, getRealSessionTier } from "@/lib/session";
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
      <div className="flex flex-1">
        <Sidebar tier={tier} />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto flex max-w-6xl flex-col gap-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
