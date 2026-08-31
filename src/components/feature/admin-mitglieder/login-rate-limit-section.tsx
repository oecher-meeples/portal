"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/ui/action-button";
import { cn } from "@/lib/utils/cn";
import {
  getMeepleLoginRateLimitStatus,
  lockMeepleLogin,
  resetMeepleLoginRateLimit,
} from "@/components/feature/admin-mitglieder/rate-limit-actions";

type Status = Awaited<ReturnType<typeof getMeepleLoginRateLimitStatus>>;

/**
 * Rate-Limit-Verwaltung für den Login (#327) — Status wird erst auf Klick
 * geladen (wie `MeepleBankDetailsSection`s IBAN-Reveal), nicht bei jedem
 * Dialog-Öffnen, um nicht für jedes Mitglied eine zusätzliche Query
 * auszulösen. "Danger" (rote Umrandung) ab dem 8h-Deckel (#326) oder bei
 * manueller Sperre.
 */
export function LoginRateLimitSection({ meepleId }: { meepleId: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [pending, setPending] = useState(false);

  async function loadStatus() {
    setPending(true);
    setStatus(await getMeepleLoginRateLimitStatus(meepleId));
    setPending(false);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">Login-Rate-Limit</span>

      {!status && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={loadStatus}
        >
          {pending ? "Lädt…" : "Status prüfen"}
        </Button>
      )}

      {status && "error" in status && (
        <p className="text-muted-foreground text-xs">{status.error}</p>
      )}

      {status && !("error" in status) && (
        <div
          className={cn(
            "flex flex-col gap-2 rounded-md border px-3 py-2 text-sm",
            status.atCap || status.manuallyLockedAt
              ? "border-destructive/50"
              : "bg-muted/40",
          )}
        >
          <p>
            {status.manuallyLockedAt
              ? "Manuell gesperrt"
              : status.currentCooldownSecs > 0
                ? `Eskaliert — ${status.failCount} Fehlversuche, aktueller Cooldown ${status.currentCooldownSecs}s`
                : "Kein aktiver Rate-Limit"}
          </p>
          <div className="flex gap-2">
            <ActionButton
              action={() =>
                resetMeepleLoginRateLimit(meepleId).then((result) => {
                  loadStatus();
                  return result;
                })
              }
              refresh={false}
              size="sm"
              variant="outline"
              pendingLabel="Setzt zurück…"
            >
              Zurücksetzen
            </ActionButton>
            {!status.manuallyLockedAt && (
              <ActionButton
                action={() =>
                  lockMeepleLogin(meepleId).then((result) => {
                    loadStatus();
                    return result;
                  })
                }
                refresh={false}
                size="sm"
                variant="destructive"
                confirm="Login für dieses Mitglied hart sperren, bis manuell zurückgesetzt?"
                pendingLabel="Sperrt…"
              >
                Hart sperren
              </ActionButton>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
