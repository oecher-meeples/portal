"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import type { ProfilePictureVisibility } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAction } from "@/components/ui/use-action";
import {
  PROFILE_PICTURE_VISIBILITY_LABELS,
  PROFILE_PICTURE_VISIBILITY_SHORT_LABELS,
} from "@/lib/members/profile-picture-visibility";
import {
  updateMeepleDaten,
  updateMeepleDatenVisibility,
} from "@/components/feature/mitglied-profil/meeple-daten-actions";
import { ProfilePictureUpload } from "@/components/feature/mitglied-profil/profile-picture-upload";

export type MeepleDatenMeeple = {
  id: string;
  bggUsername: string | null;
  bgaUsername: string | null;
  telegramHandle: string | null;
  signalHandle: string | null;
  discordHandle: string | null;
  address: string | null;
  shareAddress: boolean;
  doorbellNote: string | null;
  profilePictureUrl: string | null;
  profilePictureVisibility: ProfilePictureVisibility;
  /** Sichtbarkeit der freiwilligen Angaben unten (Live-Review F2) — für die
   * spätere Seite "Die Meeples stellen sich vor", aktuell ohne
   * Konsumenten-Logik. Wiederverwendet dasselbe Enum wie
   * `profilePictureVisibility` (#389). */
  meepleDatenVisibility: ProfilePictureVisibility;
};

type MeepleDatenForm = {
  bggUsername: string;
  bgaUsername: string;
  telegramHandle: string;
  signalHandle: string;
  discordHandle: string;
  address: string;
  shareAddress: boolean;
  doorbellNote: string;
};

function toForm(meeple: MeepleDatenMeeple): MeepleDatenForm {
  return {
    bggUsername: meeple.bggUsername ?? "",
    bgaUsername: meeple.bgaUsername ?? "",
    telegramHandle: meeple.telegramHandle ?? "",
    signalHandle: meeple.signalHandle ?? "",
    discordHandle: meeple.discordHandle ?? "",
    address: meeple.address ?? "",
    shareAddress: meeple.shareAddress,
    doorbellNote: meeple.doorbellNote ?? "",
  };
}

/** Meeple-Daten-Bereich der Profilseite (#382) — nur sichtbar bei
 * vorhandenem `meepleId` (der Aufrufer `mitglied-profil-view.tsx` blendet
 * ihn sonst ganz aus). Freiwillige Angaben, direktes Speichern statt
 * Änderungsantrag: keine Vereins-Stammdaten. */
export function MeepleDatenSection({
  meeple,
  canEdit,
  showAddress,
}: {
  meeple: MeepleDatenMeeple;
  /** Meeple selbst oder `members:manage`. */
  canEdit: boolean;
  /** `shareAddress` freigegeben, oder der Betrachter ist der Meeple selbst. */
  showAddress: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<MeepleDatenForm>(() => toForm(meeple));
  const [visibility, setVisibility] = useState<ProfilePictureVisibility>(
    meeple.meepleDatenVisibility,
  );
  const { run, pending, error } = useAction({
    onSuccess: () => setEditing(false),
  });
  const { run: runVisibility, error: visibilityError } = useAction();

  function startEdit() {
    setForm(toForm(meeple));
    setEditing(true);
  }

  async function handleSave() {
    await run(() => updateMeepleDaten(meeple.id, form));
  }

  async function handleVisibilityChange(next: ProfilePictureVisibility) {
    setVisibility(next);
    await runVisibility(() => updateMeepleDatenVisibility(meeple.id, next));
  }

  return (
    <div className="bg-card flex flex-col gap-4 rounded-lg border p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-lg font-bold">Meeple-Daten</h2>
          <p className="text-muted-foreground text-sm">
            Freiwillige Angaben für andere Meeple.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            // Bewusst unabhängig vom Editing-Formular unten (eigenes,
            // sofort speicherndes Feld, keine "Speichern"/"Abbrechen"-
            // Zugehörigkeit) — bleibt an derselben Stelle in der Kopfzeile,
            // egal ob `editing` gerade an oder aus ist, und wird nur
            // *bearbeitbar* im Editmode (sonst reines Anzeigefeld).
            <select
              aria-label="Sichtbarkeit der freiwilligen Angaben"
              title={PROFILE_PICTURE_VISIBILITY_LABELS[visibility]}
              value={visibility}
              disabled={!editing}
              onChange={(event) =>
                handleVisibilityChange(
                  event.target.value as ProfilePictureVisibility,
                )
              }
              className="border-input h-9 w-32 shrink-0 rounded-md border bg-transparent px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {Object.entries(PROFILE_PICTURE_VISIBILITY_SHORT_LABELS).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </select>
          )}
          {canEdit && !editing && (
            <Button variant="outline" size="sm" onClick={startEdit}>
              <Pencil className="size-3.5" />
              Bearbeiten
            </Button>
          )}
        </div>
      </div>
      {visibilityError && (
        <p className="text-destructive text-sm">{visibilityError}</p>
      )}

      <ProfilePictureUpload
        meepleId={meeple.id}
        profilePictureUrl={meeple.profilePictureUrl}
        visibility={meeple.profilePictureVisibility}
        canEdit={canEdit}
      />

      {editing ? (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="meeple-bgg"
              label="BoardGameGeek-Username"
              value={form.bggUsername}
              onChange={(e) =>
                setForm((p) => ({ ...p, bggUsername: e.target.value }))
              }
            />
            <TextField
              id="meeple-bga"
              label="Board Game Arena-Username"
              value={form.bgaUsername}
              onChange={(e) =>
                setForm((p) => ({ ...p, bgaUsername: e.target.value }))
              }
            />
            <TextField
              id="meeple-telegram"
              label="Telegram"
              value={form.telegramHandle}
              onChange={(e) =>
                setForm((p) => ({ ...p, telegramHandle: e.target.value }))
              }
            />
            <TextField
              id="meeple-signal"
              label="Signal"
              value={form.signalHandle}
              onChange={(e) =>
                setForm((p) => ({ ...p, signalHandle: e.target.value }))
              }
            />
            <TextField
              id="meeple-discord"
              label="Discord"
              value={form.discordHandle}
              onChange={(e) =>
                setForm((p) => ({ ...p, discordHandle: e.target.value }))
              }
            />
            <TextField
              id="meeple-doorbell"
              label="Klingelschild"
              value={form.doorbellNote}
              onChange={(e) =>
                setForm((p) => ({ ...p, doorbellNote: e.target.value }))
              }
            />
          </div>
          <TextField
            id="meeple-address"
            label="Adresse"
            value={form.address}
            onChange={(e) =>
              setForm((p) => ({ ...p, address: e.target.value }))
            }
          />
          <div className="flex items-center gap-2">
            <Switch
              id="meeple-share-address"
              checked={form.shareAddress}
              onCheckedChange={(checked) =>
                setForm((p) => ({ ...p, shareAddress: checked }))
              }
            />
            <Label htmlFor="meeple-share-address">
              Adresse für andere Meeple freigeben
            </Label>
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={pending}>
              {pending ? "Speichere…" : "Speichern"}
            </Button>
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() => setEditing(false)}
            >
              Abbrechen
            </Button>
          </div>
        </div>
      ) : (
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">BoardGameGeek</dt>
            <dd>{meeple.bggUsername ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Board Game Arena</dt>
            <dd>{meeple.bgaUsername ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Telegram</dt>
            <dd>{meeple.telegramHandle ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Signal</dt>
            <dd>{meeple.signalHandle ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Discord</dt>
            <dd>{meeple.discordHandle ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Klingelschild</dt>
            <dd>{meeple.doorbellNote ?? "—"}</dd>
          </div>
          {showAddress && (
            <div>
              <dt className="text-muted-foreground">Adresse</dt>
              <dd>{meeple.address ?? "—"}</dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}
