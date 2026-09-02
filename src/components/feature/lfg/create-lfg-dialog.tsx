"use client";

import { useState, type ReactElement } from "react";
import { Plus } from "lucide-react";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { TextAreaField, TextField } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  combineValidators,
  maxDate,
  minDate,
} from "@/components/ui/constraints";
import {
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
} from "@/components/ui/combobox";
import { createLfgPost } from "@/components/feature/lfg/actions";

/** Termine sind auf heute bis heute + 1 Jahr begrenzt (#407) — kein weiterer
 * Verwender, daher keine benannte Kombination in `constraints.ts` (DRY-Grenze
 * ist die zweite Verwendung, analog `birthDateValidator()`). */
function lfgDateValidator(
  now: Date = new Date(),
): ReturnType<typeof combineValidators> {
  const oneYearFromNow = new Date(
    now.getFullYear() + 1,
    now.getMonth(),
    now.getDate(),
  );
  return combineValidators(minDate(now), maxDate(oneYearFromNow));
}

const EMPTY_FORM = {
  gameTitle: "",
  boardGameId: null as string | null,
  title: "",
  plannedAt: "",
  location: "",
  participantsMayEditLocation: false,
  maxParticipants: 4,
  description: "",
  guestsMayBringGuests: false,
};

export type LfgBoardGameOption = { id: string; title: string };

export function CreateLfgDialog({
  boardGameOptions = [],
  trigger,
  defaultGameTitle,
  defaultBoardGameId,
  defaultMaxParticipants,
  viewerAddress,
}: {
  /** Existing inventory titles to optionally link the post to (#34) — never required. */
  boardGameOptions?: LfgBoardGameOption[];
  /** Custom trigger, e.g. the game detail page's "Spielergesuch eröffnen"
   * button (#142) — defaults to the standalone "Gesuch erstellen" button. */
  trigger?: ReactElement;
  /** Prefills the form when opened from a specific game's detail page (#142). */
  defaultGameTitle?: string;
  defaultBoardGameId?: string | null;
  defaultMaxParticipants?: number;
  /** Eigener Wohnort des Erstellers (`Meeple.address`) für den
   * "Meine Adresse übernehmen"-Button am Ortsfeld (#166) — `null`, wenn keine
   * Adresse im Profil hinterlegt ist, dann bleibt der Button verborgen. */
  viewerAddress?: string | null;
} = {}) {
  const initialForm = {
    ...EMPTY_FORM,
    gameTitle: defaultGameTitle ?? EMPTY_FORM.gameTitle,
    boardGameId: defaultBoardGameId ?? EMPTY_FORM.boardGameId,
    maxParticipants: defaultMaxParticipants ?? EMPTY_FORM.maxParticipants,
  };
  const [form, setForm] = useState(initialForm);

  function patch<K extends keyof typeof EMPTY_FORM>(
    key: K,
    value: (typeof EMPTY_FORM)[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <ActionDialog
      trigger={
        trigger ?? (
          <Button className="gap-1.5">
            <Plus className="size-4" />
            Gesuch erstellen
          </Button>
        )
      }
      title="Neues Spielergesuch"
      description="Finde Mitspielende für ein bestimmtes Spiel oder spontan für einen Abend."
      submitLabel="Gesuch veröffentlichen"
      canSubmit={Boolean(form.title.trim()) && Boolean(form.description.trim())}
      action={() =>
        createLfgPost({
          title: form.title,
          gameTitle: form.gameTitle || undefined,
          boardGameId: form.boardGameId,
          description: form.description,
          plannedAt: form.plannedAt ? new Date(form.plannedAt) : undefined,
          location: form.location || undefined,
          participantsMayEditLocation: form.participantsMayEditLocation,
          maxParticipants: Number(form.maxParticipants),
          guestsMayBringGuests: form.guestsMayBringGuests,
        })
      }
      onReset={() => setForm(initialForm)}
    >
      <div className="flex flex-col gap-3">
        <TextField
          id="lfg-game"
          label="Spiel (Freitext, optional)"
          value={form.gameTitle}
          onChange={(event) => patch("gameTitle", event.target.value)}
          placeholder="z. B. Arche Nova"
        />
        {boardGameOptions.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lfg-board-game">
              Aus dem Bestand wählen (optional)
            </Label>
            <Combobox
              items={boardGameOptions.map((option) => option.title)}
              value={
                boardGameOptions.find((o) => o.id === form.boardGameId)
                  ?.title ?? null
              }
              onValueChange={(title) => {
                const selected = boardGameOptions.find(
                  (o) => o.title === title,
                );
                patch("boardGameId", selected?.id ?? null);
                if (selected) patch("gameTitle", selected.title);
              }}
            >
              <ComboboxInput id="lfg-board-game" placeholder="Titel suchen …" />
              <ComboboxPopup>
                <ComboboxEmpty>Keine Treffer</ComboboxEmpty>
                <ComboboxList>
                  {(title: string) => (
                    <ComboboxItem key={title} value={title}>
                      {title}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxPopup>
            </Combobox>
          </div>
        )}
        <TextField
          id="lfg-title"
          label="Titel"
          value={form.title}
          onChange={(event) => patch("title", event.target.value)}
          placeholder="z. B. Runde am Freitag"
          required
        />
        <div className="grid grid-cols-2 gap-3">
          <DatePicker
            id="lfg-date"
            label="Datum (optional)"
            openAt="Month"
            validate={lfgDateValidator()}
            value={form.plannedAt}
            onChange={(value) => patch("plannedAt", value)}
          />
          <TextField
            id="lfg-max"
            label="Max. Teilnehmer"
            type="number"
            min={2}
            value={form.maxParticipants}
            onChange={(event) =>
              patch("maxParticipants", Number(event.target.value))
            }
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <TextField
            id="lfg-location"
            label="Ort (optional)"
            value={form.location}
            onChange={(event) => patch("location", event.target.value)}
            placeholder="z. B. bei mir zuhause"
          />
          {viewerAddress && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() => patch("location", viewerAddress)}
            >
              Meine Adresse übernehmen
            </Button>
          )}
        </div>
        <TextAreaField
          id="lfg-desc"
          label="Beschreibung"
          rows={3}
          value={form.description}
          onChange={(event) => patch("description", event.target.value)}
          placeholder="Worauf freust du dich, wen suchst du?"
          required
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.guestsMayBringGuests}
            onChange={(event) =>
              patch("guestsMayBringGuests", event.target.checked)
            }
          />
          Meine Gäste dürfen Gäste mitbringen
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.participantsMayEditLocation}
            onChange={(event) =>
              patch("participantsMayEditLocation", event.target.checked)
            }
          />
          Teilnehmer dürfen Ort festlegen
        </label>
      </div>
    </ActionDialog>
  );
}
