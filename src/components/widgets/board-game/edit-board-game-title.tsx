"use client";

import { useState } from "react";
import { BoardGameKind } from "@prisma/client";
import { Field, TextField, TextAreaField } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MultiSelectCombobox } from "@/components/ui/multi-select-combobox";
import { EanField } from "@/components/widgets/board-game/ean-field";
import { parseMechanics, formatMechanics } from "@/lib/ludothek/bgg-id";
import { translateDescription } from "@/lib/ludothek/board-games";
import type { BoardGameFormValues } from "@/components/widgets/board-game/board-game-form-values";

/**
 * Title-level fields — everything shared by every physical copy of this
 * title (see ADR 0008). `condition` lives in `EditBoardGameExemplar`
 * instead: it's per-copy, not per-title.
 *
 * Row layout (#124): Titel+Art, EAN+BGG-ID, Spielerzahl+Dauer+Komplexität,
 * Mechaniken, Bild+Erklärvideo, Beschreibung.
 */
export function EditBoardGameTitle({
  idPrefix,
  values,
  onChange,
  mechanicsOptions,
  titleWarning,
  onLoadExistingTitle,
  loadingExistingTitle,
}: {
  idPrefix: string;
  values: BoardGameFormValues;
  onChange: (patch: Partial<BoardGameFormValues>) => void;
  /** Autocomplete suggestions for the Mechaniken multiselect, sourced from
   * the existing Bestand — omit to keep the plain comma-separated text
   * field (e.g. when creating a brand-new title with no suggestions yet
   * worth showing) (#124). */
  mechanicsOptions?: string[];
  /** Rahmt das Titel-Feld in derselben Warnfarbe wie die Duplikat-Warnung im
   * Anlegen-Dialog — Titel existiert bereits, Eingabe wird verworfen (#183). */
  titleWarning?: boolean;
  /** Zeigt bei `titleWarning` einen "Titel laden"-Button unter dem Titel-Feld
   * — übernimmt die echten Bestandsdaten statt die Eingabe zu verwerfen,
   * damit Korrekturen möglich bleiben (#183). */
  onLoadExistingTitle?: () => void;
  /** Deaktiviert den "Titel laden"-Button während der Server-Anfrage. */
  loadingExistingTitle?: boolean;
}) {
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);

  async function handleTranslateDescription() {
    setIsTranslating(true);
    setTranslationError(null);
    try {
      const result = await translateDescription(values.description);
      if (!result.success) {
        setTranslationError(result.error);
        return;
      }
      onChange({ description: result.text });
    } catch (err) {
      setTranslationError(
        err instanceof Error
          ? err.message
          : "Die Übersetzung ist fehlgeschlagen. Bitte erneut versuchen.",
      );
    } finally {
      setIsTranslating(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <TextField
          id={`${idPrefix}-title`}
          label="Titel"
          value={values.title}
          onChange={(event) => onChange({ title: event.target.value })}
          required
          warning={titleWarning}
          className={
            titleWarning
              ? "border-amber-600 focus-visible:border-amber-600 focus-visible:ring-amber-600/50"
              : undefined
          }
        />
        {titleWarning && onLoadExistingTitle && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onLoadExistingTitle}
            disabled={loadingExistingTitle}
            className="self-start"
          >
            {loadingExistingTitle ? "Lade…" : "Titel laden"}
          </Button>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-kind`}>Art</Label>
        <select
          id={`${idPrefix}-kind`}
          value={values.kind}
          onChange={(event) =>
            onChange({ kind: event.target.value as BoardGameKind })
          }
          className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
        >
          <option value={BoardGameKind.BOARDGAME}>Basisspiel</option>
          <option value={BoardGameKind.BOARDGAME_EXPANSION}>Erweiterung</option>
        </select>
      </div>

      <EanField
        idPrefix={idPrefix}
        value={values.ean}
        onChange={(ean) => onChange({ ean })}
      />
      <TextField
        id={`${idPrefix}-bgg-id`}
        label="BGG-ID"
        value={values.bggId}
        onChange={(event) => onChange({ bggId: event.target.value })}
        placeholder="optional, z. B. 342942"
      />

      <div className="flex gap-3 sm:col-span-2">
        <TextField
          id={`${idPrefix}-min-players`}
          label="Spieler von"
          type="number"
          min={1}
          fieldClassName="flex-1"
          value={values.minPlayers}
          onChange={(event) => onChange({ minPlayers: event.target.value })}
        />
        <TextField
          id={`${idPrefix}-max-players`}
          label="Spieler bis"
          type="number"
          min={1}
          fieldClassName="flex-1"
          value={values.maxPlayers}
          onChange={(event) => onChange({ maxPlayers: event.target.value })}
        />
        <TextField
          id={`${idPrefix}-play-time`}
          label="Spieldauer (Min.)"
          type="number"
          min={1}
          fieldClassName="flex-1"
          value={values.playTimeMinutes}
          onChange={(event) =>
            onChange({ playTimeMinutes: event.target.value })
          }
        />
        <TextField
          id={`${idPrefix}-weight`}
          label="Komplexität (1–5)"
          type="number"
          min={1}
          max={5}
          step={0.1}
          fieldClassName="flex-1"
          value={values.weight}
          onChange={(event) => onChange({ weight: event.target.value })}
        />
      </div>

      {mechanicsOptions ? (
        <Field
          label="Mechaniken"
          htmlFor={`${idPrefix}-mechanics`}
          className="sm:col-span-2"
        >
          <MultiSelectCombobox
            id={`${idPrefix}-mechanics`}
            options={mechanicsOptions}
            value={parseMechanics(values.mechanics)}
            onValueChange={(next) =>
              onChange({ mechanics: formatMechanics(next) })
            }
            placeholder="Mechanik suchen …"
            emptyLabel="Keine passende Mechanik"
          />
        </Field>
      ) : (
        <TextField
          id={`${idPrefix}-mechanics`}
          label="Mechaniken"
          fieldClassName="sm:col-span-2"
          value={values.mechanics}
          onChange={(event) => onChange({ mechanics: event.target.value })}
          placeholder="Worker Placement, Drafting, …"
          hint="Kommagetrennt."
        />
      )}

      <TextField
        id={`${idPrefix}-image-url`}
        label="Bild-URL"
        value={values.imageUrl}
        onChange={(event) => onChange({ imageUrl: event.target.value })}
        placeholder="https://…"
      />
      <TextField
        id={`${idPrefix}-video`}
        label="Erklärvideo (YouTube-Link)"
        value={values.explainerVideoUrl}
        onChange={(event) =>
          onChange({ explainerVideoUrl: event.target.value })
        }
        placeholder="https://www.youtube.com/watch?v=…"
      />

      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <TextAreaField
          id={`${idPrefix}-description`}
          label="Beschreibung"
          value={values.description}
          onChange={(event) => onChange({ description: event.target.value })}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleTranslateDescription}
          disabled={isTranslating || !values.description.trim()}
          className="self-start"
        >
          {isTranslating ? "Übersetze…" : "Übersetzen"}
        </Button>
        {translationError && (
          <p className="text-destructive text-xs">{translationError}</p>
        )}
      </div>
    </div>
  );
}
