"use client";

import Link from "next/link";
import { LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { ProfileLink } from "@/components/layout/profile-link";
import { useSignOut } from "@/components/layout/use-sign-out";

/**
 * Anmelden/Profil/Abmelden im Header. `< md` komplett ausgeblendet — dort
 * stehen die Einträge im ersten Bottom-Sheet der `MobileNav` (#582).
 * Zwischen `md` und `lg` nur Icons mit Tooltip, damit der Header nie
 * überläuft; ab `lg` mit Text.
 */
export function UserMenu({
  user,
}: {
  user: { name: string; meepleId: string } | null;
}) {
  const signOut = useSignOut();

  if (!user) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="hidden gap-1.5 md:inline-flex"
        render={
          <Link href="/login">
            <LogIn className="size-4" />
            Anmelden
          </Link>
        }
      />
    );
  }

  return (
    <div className="hidden items-center gap-2 text-sm md:flex">
      <ProfileLink user={user} labelClassName="hidden lg:inline" tooltip />
      <Tooltip content="Abmelden" side="bottom">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          aria-label="Abmelden"
          onClick={signOut}
        >
          <LogOut className="size-4" />
          <span className="hidden lg:inline">Abmelden</span>
        </Button>
      </Tooltip>
    </div>
  );
}
