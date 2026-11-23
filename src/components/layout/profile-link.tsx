"use client";

import { useState } from "react";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { MeepleQrDialog } from "@/components/layout/meeple-qr-dialog";
import { Tooltip } from "@/components/ui/tooltip";
import { useLongPress } from "@/components/ui/use-long-press";
import { cn } from "@/lib/utils/cn";

/**
 * Link aufs eigene Profil mit Longpress-QR (#465) — geteilt von Header und
 * Bottom-Sheet (#582), damit der Longpress überall gilt, wo der Link steht.
 */
export function ProfileLink({
  user,
  className,
  labelClassName,
  tooltip = false,
  onNavigate,
}: {
  user: { name: string; meepleId: string };
  className?: string;
  /** z. B. `hidden lg:inline`, wenn nur das Icon sichtbar sein soll. */
  labelClassName?: string;
  /** Name zusätzlich als Tooltip (wenn das Label ausgeblendet sein kann). */
  tooltip?: boolean;
  /** Wird bei einem normalen Klick (kein Longpress) aufgerufen. */
  onNavigate?: () => void;
}) {
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const { consumeFired, handlers } = useLongPress(() => setQrDialogOpen(true));

  const link = (
    // #465: Longpress öffnet den persönlichen QR-Code statt zu navigieren
    // — ein normaler (kurzer) Klick geht weiterhin aufs eigene Profil.
    <Link
      href="/profil"
      aria-label={user.name}
      className={cn(
        "text-muted-foreground hover:text-foreground inline-flex min-w-0 items-center gap-1.5 text-sm",
        className,
      )}
      onClick={(event) => {
        if (consumeFired()) {
          event.preventDefault();
          // Der durchs Loslassen ausgelöste Klick bubbelt sonst bis zum
          // Dialog-Root hoch und wird dort als Klick "außerhalb" gewertet
          // — der gerade erst geöffnete QR-Dialog ging dadurch sofort
          // wieder zu, noch bevor man ihn zeigen konnte.
          event.stopPropagation();
          return;
        }
        onNavigate?.();
      }}
      {...handlers}
    >
      <UserRound className="text-primary size-4 shrink-0" />
      <span className={cn("truncate", labelClassName)}>{user.name}</span>
    </Link>
  );

  return (
    <>
      {tooltip ? (
        <Tooltip content={user.name} side="bottom">
          {link}
        </Tooltip>
      ) : (
        link
      )}
      <MeepleQrDialog
        meepleId={user.meepleId}
        open={qrDialogOpen}
        onOpenChange={setQrDialogOpen}
      />
    </>
  );
}
