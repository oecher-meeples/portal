"use client";

import { useState } from "react";
import { Copy, Mail, RefreshCw, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { useAction } from "@/components/ui/use-action";
import { formatDateTime } from "@/lib/utils/format";
import {
  generateMemberCalendarSubscription,
  revokeMemberCalendarSubscription,
  sendMemberCalendarSubscriptionMail,
} from "@/components/feature/mitglied-profil/kalender-token-actions";

/** Verwaltung des persönlichen Abo-Tokens für den internen Kalender-Feed
 * (#438) — Struktur analog `bankverbindung-section.tsx`. Nur `admin:access`
 * sieht diesen Bereich (Aufrufer blendet ihn sonst aus); die eigentliche
 * Google-Calendar-URL geht nie an den Client, siehe
 * `lib/members/calendar-token.ts`. */
export function KalenderTokenSection({
  memberId,
  hasToken,
  tokenCreatedAt,
}: {
  memberId: string;
  hasToken: boolean;
  tokenCreatedAt: string | null;
}) {
  const [subscribeUrl, setSubscribeUrl] = useState<string | null>(null);
  const { run, pending, error } = useAction();

  async function handleGenerate() {
    await run(async () => {
      const result = await generateMemberCalendarSubscription(memberId);
      setSubscribeUrl(result.subscribeUrl);
      return { success: true as const };
    });
  }

  async function handleRevoke() {
    setSubscribeUrl(null);
    await run(() => revokeMemberCalendarSubscription(memberId));
  }

  async function handleSendMail() {
    setSubscribeUrl(null);
    await run(() => sendMemberCalendarSubscriptionMail(memberId));
  }

  return (
    <div className="bg-card flex flex-col gap-4 rounded-lg border p-5">
      <h2 className="font-serif text-lg font-bold">
        Interner Kalender-Abo-Link
      </h2>
      <p className="text-muted-foreground text-sm">
        Persönlicher, widerrufbarer Link zum Abonnieren des internen
        Vereinskalenders in einer Kalender-App. Die eigentliche
        Google-Calendar-Adresse wird dabei nie herausgegeben.
      </p>

      <p className="text-sm">
        Status:{" "}
        {hasToken ? (
          <>erzeugt am {formatDateTime(tokenCreatedAt!)}</>
        ) : (
          "noch nicht erzeugt"
        )}
      </p>

      {subscribeUrl && (
        <div className="bg-muted flex flex-wrap items-center gap-2 rounded-md p-3 text-sm">
          <span className="font-mono break-all">{subscribeUrl}</span>
          <CopyButton value={subscribeUrl} label="Kopieren" icon={Copy} />
        </div>
      )}

      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={handleGenerate}
        >
          <RefreshCw className="size-3.5" />
          Neu erzeugen
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={handleSendMail}
        >
          <Mail className="size-3.5" />
          Per Mail versenden
        </Button>
        {hasToken && (
          <Button
            variant="destructive"
            size="sm"
            disabled={pending}
            onClick={handleRevoke}
          >
            <Ban className="size-3.5" />
            Widerrufen
          </Button>
        )}
      </div>
    </div>
  );
}
