"use client";

import { useState } from "react";
import { BoardGameKind } from "@prisma/client";
import { Field, TextField, TextAreaField } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MultiSelectCombobox } from "@/components/ui/multi-select-combobox";
import { EanField } from "@/components/widgets/board-game/ean-field";
import { BggIdField } from "@/components/widgets/board-game/bgg-id-field";
import { TitleOverviewDialog } from "@/components/widgets/board-game/title-overview-dialog";
import { cn } from "@/lib/utils/cn";
import { formatMechanics, parseMechanics } from "@/lib/ludothek/bgg-id";
import { translateDescription } from "@/lib/ludothek/board-games-bgg-import";
import { ExplainerVideoField } from "@/components/widgets/board-game/explainer-video-field";
import type { BoardGameFormValues } from "@/components/widgets/board-game/board-game-form-values";
import type { BoardGameCompareField } from "@/lib/ludothek/board-game-bgg-compare";

/** Randfarbe je Abgleichsstatus im "Daten mit BGG abgleichen"-Modus (#189) —
 * `undefined` (Feld nicht im `compareStatus` enthalten) lässt das Feld
 * unverändert. */
function diffClassName(status: boolean | undefined): string | undefined {
  if (status === undefined) return undefined;
  return status
    ? "border-emerald-600 focus-visible:border-emerald-600 focus-visible:ring-emerald-600/50"
    : "border-red-600 focus-visible:border-red-600 focus-visible:ring-red-600/50";
}

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
  compareStatus,
  eanAutoSearch,
  eanAlternateTitles,
  boardGameId,
}: {
  idPrefix: string;
  values: BoardGameFormValues;
  onChange: (patch: Partial<BoardGameFormValues>) => void;
  /** Nur im Bearbeiten-Modus gesetzt (#203) — blendet den "Alle Titel"-Dialog
   * neben dem Sekundärtitel-Feld ein. Beim Anlegen eines neuen Titels gibt es
   * noch keine ID, also auch keine Alternativtitel-Verwaltung. */
  boardGameId?: string;
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
  /** Grün/Rot-Randfarbe je Feld gegenüber frisch geladenen BGG-Daten — nur
   * im "Daten mit BGG abgleichen"-Modus gesetzt (#189). Felder ohne
   * BGG-Entsprechung (EAN, Art, BGG-ID, Erklärvideo) bleiben unberührt. */
  compareStatus?: Partial<Record<BoardGameCompareField, boolean>>;
  /** Löst im EAN-Feld automatisch eine EAN-Suche aus, wenn das Feld beim
   * Mounten leer ist — nur in Schritt 2 des Anlegen-Wizards gesetzt (#197). */
  eanAutoSearch?: boolean;
  /** BGGs Alternativnamen (#187) — Fallback-Reihenfolge für die EAN-Suche,
   * wenn der Haupttitel keinen Treffer liefert (#197-Folgeanfrage). */
  eanAlternateTitles?: string[];
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
          className={cn(
            titleWarning &&
              "border-amber-600 focus-visible:border-amber-600 focus-visible:ring-amber-600/50",
            diffClassName(compareStatus?.title),
          )}
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
          className={cn(
            "border-input h-9 rounded-md border bg-transparent px-3 text-sm",
            diffClassName(compareStatus?.kind),
          )}
        >
          <option value={BoardGameKind.BOARDGAME}>Basisspiel</option>
          <option value={BoardGameKind.BOARDGAME_EXPANSION}>Erweiterung</option>
        </select>
      </div>

      <Field
        label="Sekundärtitel (optional)"
        htmlFor={`${idPrefix}-secondary-title`}
        className="sm:col-span-2"
      >
        <div className="flex gap-2">
          <Input
            id={`${idPrefix}-secondary-title`}
            value={values.secondaryTitle}
            onChange={(event) =>
              onChange({ secondaryTitle: event.target.value })
            }
            placeholder="z. B. deutscher Titel neben einem englischen Haupttitel"
          />
          {boardGameId && (
            <TitleOverviewDialog
              boardGameId={boardGameId}
              title={values.title}
              secondaryTitle={values.secondaryTitle}
            />
          )}
        </div>
      </Field>

      <EanField
        idPrefix={idPrefix}
        value={values.ean}
        onChange={(ean) => onChange({ ean })}
        title={values.title}
        autoSearchOnMount={eanAutoSearch}
        alternateTitles={eanAlternateTitles}
      />
      <BggIdField
        idPrefix={idPrefix}
        value={values.bggId}
        title={values.title}
        onChange={(bggId) => onChange({ bggId })}
      />

      <div className="flex gap-3 sm:col-span-2">
        <TextField
          id={`${idPrefix}-min-players`}
          label="Spieler von"
          type="number"
          min={1}
          fieldClassName="flex-1"
          className={diffClassName(compareStatus?.minPlayers)}
          value={values.minPlayers}
          onChange={(event) => onChange({ minPlayers: event.target.value })}
        />
        <TextField
          id={`${idPrefix}-max-players`}
          label="Spieler bis"
          type="number"
          min={1}
          fieldClassName="flex-1"
          className={diffClassName(compareStatus?.maxPlayers)}
          value={values.maxPlayers}
          onChange={(event) => onChange({ maxPlayers: event.target.value })}
        />
        <TextField
          id={`${idPrefix}-play-time`}
          label="Spieldauer (Min.)"
          type="number"
          min={1}
          fieldClassName="flex-1"
          className={diffClassName(compareStatus?.playTimeMinutes)}
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
          className={diffClassName(compareStatus?.weight)}
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
            className={diffClassName(compareStatus?.mechanics)}
          />
        </Field>
      ) : (
        <TextField
          id={`${idPrefix}-mechanics`}
          label="Mechaniken"
          fieldClassName="sm:col-span-2"
          className={diffClassName(compareStatus?.mechanics)}
          value={values.mechanics}
          onChange={(event) => onChange({ mechanics: event.target.value })}
          placeholder="Worker Placement, Drafting, …"
          hint="Kommagetrennt."
        />
      )}

      <TextField
        id={`${idPrefix}-image-url`}
        label="Bild-URL"
        className={diffClassName(compareStatus?.imageUrl)}
        value={values.imageUrl}
        onChange={(event) => onChange({ imageUrl: event.target.value })}
        placeholder="https://…"
      />
      <ExplainerVideoField
        idPrefix={idPrefix}
        value={values.explainerVideoUrl}
        bggIdText={values.bggId}
        onChange={(url) => onChange({ explainerVideoUrl: url })}
      />

      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <TextAreaField
          id={`${idPrefix}-description`}
          label="Beschreibung"
          className={diffClassName(compareStatus?.description)}
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
