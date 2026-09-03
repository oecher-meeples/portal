"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, LogOut, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";
import { clearPreviewTier } from "@/components/feature/admin-preview-tier/actions";
import { PINNED_STORAGE_KEY } from "@/components/layout/sidebar";

export function UserMenu({ user }: { user: { name: string } | null }) {
  const router = useRouter();

  if (!user) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5"
        render={
          <Link href="/login">
            <LogIn className="size-4" />
            Anmelden
          </Link>
        }
      />
    );
  }

  async function handleSignOut() {
    await Promise.all([authClient.signOut(), clearPreviewTier()]);
    // #472: Client-Präferenzen sind geräte-, nicht kontogebunden — ohne das
    // hier zu räumen, würde die nächste Person am selben Gerät (auch ein
    // anderes Meeple) im zuletzt angehefteten Sidebar-Zustand starten.
    localStorage.removeItem(PINNED_STORAGE_KEY);
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <Link
        href="/profil"
        className="text-muted-foreground hover:text-foreground hidden items-center gap-1.5 sm:inline-flex"
      >
        <UserRound className="text-primary size-4" />
        {user.name}
      </Link>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5"
        onClick={handleSignOut}
      >
        <LogOut className="size-4" />
        Abmelden
      </Button>
    </div>
  );
}
