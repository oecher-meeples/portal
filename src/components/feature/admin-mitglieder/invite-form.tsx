"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { createInvite } from "@/components/feature/admin-mitglieder/invite-actions";
import {
  buildRegistrationLink,
  DEFAULT_BOUND_DAYS,
  DEFAULT_UNBOUND_DAYS,
  formatInviteMessage,
  MAX_INVITE_DAYS,
} from "@/lib/members/invites";

export function InviteForm() {
  const [unbound, setUnbound] = useState(false);
  const [email, setEmail] = useState("");
  const [days, setDays] = useState<number>(DEFAULT_BOUND_DAYS);
  const [isPending, setIsPending] = useState(false);
  const [result, setResult] = useState<{
    token: string;
    expiresAt: string;
    extended: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleUnboundChange(checked: boolean) {
    setUnbound(checked);
    setDays(checked ? DEFAULT_UNBOUND_DAYS : DEFAULT_BOUND_DAYS);
  }

  async function handleCreateInvite() {
    setIsPending(true);
    setError(null);

    try {
      const created = await createInvite({
        email: unbound ? null : email,
        days,
      });
      setResult({
        token: created.token,
        expiresAt: created.expiresAt,
        extended: created.extended,
      });
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
    ? buildRegistrationLink(
        window.location.origin,
        result.token,
        unbound ? null : email,
      )
    : null;

  const mailtoHref =
    inviteLink && result
      ? `mailto:${unbound ? "" : email}?subject=${encodeURIComponent(
          "Einladung zu Oecher Meeples",
        )}&body=${encodeURIComponent(
          formatInviteMessage(inviteLink, new Date(result.expiresAt)),
        )}`
      : null;

  return (
    <div className="bg-card flex flex-col gap-4 rounded-lg border p-6">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={unbound}
          onChange={(event) => handleUnboundChange(event.target.checked)}
        />
        Ungebundene Einladung (mehrfach nutzbar, keine E-Mail-Bindung)
      </label>

      <div className="grid gap-4 sm:grid-cols-[2fr_1fr_auto]">
        <TextField
          id="invite-email"
          type="email"
          label="E-Mail-Adresse"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={unbound}
          required={!unbound}
        />
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
          disabled={isPending}
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
              E-Mail wurde bereits eingeladen, Gültigkeitsdauer wurde
              verlängert.
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">
              Registrierungslink ({days} {days === 1 ? "Tag" : "Tage"} gültig):
            </p>
          )}
          <code className="bg-muted rounded px-2 py-1 text-xs break-all">
            {inviteLink}
          </code>
          <a href={mailtoHref} className="text-primary text-sm hover:underline">
            Per E-Mail versenden
          </a>
        </div>
      )}
    </div>
  );
}
