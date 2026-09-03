"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
} from "@/components/ui/combobox";
import { useControlledComboboxInput } from "@/components/ui/use-controlled-combobox-input";
import { createInvite } from "@/components/feature/admin-mitglieder/invite-actions";
import {
  buildRegistrationLink,
  formatInviteMessage,
} from "@/lib/members/invites";
import type { MemberWithoutLoginRow } from "@/lib/members/members-without-login";

/** Suchschlüssel eines Mitglieds in der Combobox — eindeutig (führt die
 * Mitgliedsnummer), dient sowohl der Textsuche als auch als `value` des
 * jeweiligen Items. Sichtbar dargestellt wird Name/E-Mail zweizeilig (s.
 * `ComboboxItem` unten), nicht dieser String selbst. */
function memberSearchKey(member: MemberWithoutLoginRow) {
  return `#${member.memberNumber} ${member.displayName} (${member.email})`;
}

export function InviteForm({
  membersWithoutLogin,
  defaultDays,
  initialSearch = "",
}: {
  membersWithoutLogin: MemberWithoutLoginRow[];
  /** Zentraler Wert aus `/admin/einstellungen/einladungen` (#349) — hier nur
   * noch angezeigt, nicht mehr pro Einladung überschreibbar. */
  defaultDays: number;
  /** Vorbelegt das Mitglied-Suchfeld, z. B. mit der (erfolglosen) Eingabe aus
   * der Einladungen-Suche darüber (Live-Review) — läuft live mit, solange
   * noch kein Mitglied ausgewählt ist (danach hat die Auswahl Vorrang, s.
   * `useControlledComboboxInput`). */
  initialSearch?: string;
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

  const selectedMember =
    membersWithoutLogin.find((member) => member.id === memberId) ?? null;
  const [inputValue, setInputValue] = useControlledComboboxInput(
    selectedMember?.displayName ?? initialSearch,
  );

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
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-[2fr_auto]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="invite-member">Mitglied</Label>
          <Combobox
            items={membersWithoutLogin.map(memberSearchKey)}
            value={selectedMember ? memberSearchKey(selectedMember) : null}
            inputValue={inputValue}
            onInputValueChange={setInputValue}
            onValueChange={(key) => {
              const selected = membersWithoutLogin.find(
                (member) => memberSearchKey(member) === key,
              );
              setMemberId(selected?.id ?? "");
            }}
          >
            <ComboboxInput
              id="invite-member"
              disabled={membersWithoutLogin.length === 0}
              placeholder={
                membersWithoutLogin.length === 0
                  ? "Keine Mitglieder ohne Login vorhanden"
                  : "Mitglied ohne Login suchen …"
              }
            />
            <ComboboxPopup>
              <ComboboxEmpty>Keine Treffer.</ComboboxEmpty>
              <ComboboxList>
                {(key: string) => {
                  const member = membersWithoutLogin.find(
                    (candidate) => memberSearchKey(candidate) === key,
                  );
                  if (!member) return null;
                  return (
                    <ComboboxItem key={key} value={key}>
                      {/* Name/E-Mail zweizeilig statt einer langen Zeile
                       * ("#num Name (email)") — hält die Combobox schmal,
                       * sonst zwang die Breite des längsten Eintrags den
                       * Button daneben aus dem Akkordeon hinaus. */}
                      <span className="flex flex-col">
                        <span>
                          #{member.memberNumber} {member.displayName}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {member.email}
                        </span>
                      </span>
                    </ComboboxItem>
                  );
                }}
              </ComboboxList>
            </ComboboxPopup>
          </Combobox>
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
