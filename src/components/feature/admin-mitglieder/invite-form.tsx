"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createInvite } from "@/components/feature/admin-mitglieder/invite-actions";
import {
  buildRegistrationLink,
  formatInviteMessage,
} from "@/lib/members/invites";
import type { MemberWithoutLoginRow } from "@/lib/members/members-without-login";

export function InviteForm({
  membersWithoutLogin,
  defaultDays,
}: {
  membersWithoutLogin: MemberWithoutLoginRow[];
  /** Zentraler Wert aus `/admin/einstellungen/einladungen` (#349) — hier nur
   * noch angezeigt, nicht mehr pro Einladung überschreibbar. */
  defaultDays: number;
}) {
  const [memberId, setMemberId] = useState<string>("");
  const [isPending, setIsPending] = useState(false);
  const [result, setResult] = useState<{
    token: string;
    email: string;
    expiresAt: string;
    extended: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateInvite() {
    if (!memberId) {
      setError("Bitte ein Mitglied auswählen.");
      return;
    }
    setIsPending(true);
    setError(null);

    try {
      const created = await createInvite({ memberId });
      setResult(created);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Einladung konnte nicht erzeugt werden.",
      );
    } finally {
      setIsPending(false);
    }
  }

  const inviteLink = result
    ? buildRegistrationLink(window.location.origin, result.token, result.email)
    : null;

  const mailtoHref =
    inviteLink && result
      ? `mailto:${result.email}?subject=${encodeURIComponent(
          "Einladung zu Oecher Meeples",
        )}&body=${encodeURIComponent(
          formatInviteMessage(inviteLink, new Date(result.expiresAt)),
        )}`
      : null;

  return (
    <div className="bg-card flex flex-col gap-4 rounded-lg border p-6">
      <h2 className="font-serif text-lg font-bold">Einladung erstellen</h2>
      <p className="text-muted-foreground text-sm">
        Eine Einladung ist immer an ein bestehendes Vereinsmitglied gebunden —
        die E-Mail-Adresse kommt aus dessen Stammdaten. Gültigkeitsdauer:{" "}
        {defaultDays} {defaultDays === 1 ? "Tag" : "Tage"} (zentral in den
        Einladungseinstellungen hinterlegt).
      </p>

      <div className="grid gap-4 sm:grid-cols-[2fr_auto]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="invite-member">Mitglied</Label>
          <select
            id="invite-member"
            value={memberId}
            onChange={(event) => setMemberId(event.target.value)}
            className="border-input h-9 rounded-md border bg-transparent px-2 text-sm"
          >
            <option value="" disabled>
              {membersWithoutLogin.length === 0
                ? "Keine Mitglieder ohne Login vorhanden"
                : "Mitglied ohne Login wählen …"}
            </option>
            {membersWithoutLogin.map((member) => (
              <option key={member.id} value={member.id}>
                #{member.memberNumber} {member.displayName} ({member.email})
              </option>
            ))}
          </select>
        </div>
        <Button
          onClick={handleCreateInvite}
          disabled={isPending || !memberId}
          className="self-end"
        >
          <UserPlus />
          {isPending ? "Erzeuge Einladung…" : "Einladung erzeugen"}
        </Button>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {inviteLink && mailtoHref && (
        <div className="flex flex-col gap-2">
          {result?.extended ? (
            <p className="text-sm">
              Für dieses Mitglied lag bereits eine offene Einladung vor, die
              Gültigkeitsdauer wurde verlängert.
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">
              Registrierungslink ({defaultDays}{" "}
              {defaultDays === 1 ? "Tag" : "Tage"} gültig):
            </p>
          )}
          <code className="bg-muted rounded px-2 py-1 text-xs break-all">
            {inviteLink}
          </code>
          <a
            href={mailtoHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary text-sm hover:underline"
          >
            Per E-Mail versenden
          </a>
        </div>
      )}
    </div>
  );
}
