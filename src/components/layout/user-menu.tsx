"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";
import { clearPreviewTier } from "@/components/layout/preview-tier-actions";

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
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground hidden sm:inline">
        {user.name}
      </span>
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
