"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { createInvite } from "@/components/feature/admin-mitglieder/invite-actions";
import {
  buildRegistrationLink,
  formatInviteMessage,
  MAX_INVITE_DAYS,
} from "@/lib/members/invites";
import type { MemberWithoutLoginRow } from "@/lib/members/members-without-login";

export function InviteForm({
  membersWithoutLogin,
  defaultDays,
}: {
  membersWithoutLogin: MemberWithoutLoginRow[];
  defaultDays: number;
}) {
  const [memberId, setMemberId] = useState<string>("");
  const [days, setDays] = useState<number>(defaultDays);
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
      const created = await createInvite({ memberId, days });
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
        die E-Mail-Adresse kommt aus dessen Stammdaten.
      </p>

      <div className="grid gap-4 sm:grid-cols-[2fr_1fr_auto]">
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
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="invite-days">Gültigkeit (Tage)</Label>
          <Input
            id="invite-days"
            type="number"
            min={0}
            max={MAX_INVITE_DAYS}
            step={0.5}
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
          />
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
              Registrierungslink ({days} {days === 1 ? "Tag" : "Tage"} gültig):
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
