"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, LogOut, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";
import { clearPreviewTier } from "@/components/feature/admin-preview-tier/actions";
import { MeepleQrDialog } from "@/components/layout/meeple-qr-dialog";
import { useLongPress } from "@/components/ui/use-long-press";

export function UserMenu({
  user,
}: {
  user: { name: string; meepleId: string } | null;
}) {
  const router = useRouter();
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const { consumeFired, handlers } = useLongPress(() => setQrDialogOpen(true));

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
    // #472/#339: Client-Präferenzen (Sidebar-Pin, geschlossene
    // Notification-Hinweise) sind geräte-, nicht kontogebunden — ohne das
    // hier zu räumen, würde die nächste Person am selben Gerät (auch ein
    // anderes Meeple) im zuletzt angehefteten Sidebar-Zustand starten bzw.
    // eine für die vorige Person geschlossene Notification nie mehr sehen.
    localStorage.clear();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      {/* #465: Longpress öffnet den persönlichen QR-Code statt zu navigieren
          — ein normaler (kurzer) Klick geht weiterhin aufs eigene Profil. */}
      <Link
        href="/profil"
        className="text-muted-foreground hover:text-foreground hidden items-center gap-1.5 sm:inline-flex"
        onClick={(event) => {
          if (consumeFired()) event.preventDefault();
        }}
        {...handlers}
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
      <MeepleQrDialog
        meepleId={user.meepleId}
        open={qrDialogOpen}
        onOpenChange={setQrDialogOpen}
      />
    </div>
  );
}
