import { TextField, TextAreaField } from "@/components/ui/field";
import {
  parseBggId,
  parseMechanics,
  formatMechanics,
} from "@/lib/ludothek/bgg-id";
import type { BoardGameInput } from "@/lib/ludothek/board-games";

/** All manually editable BoardGame fields, as raw string form state. */
export type BoardGameFormValues = {
  title: string;
  ean: string;
  condition: string;
  bggId: string;
  minPlayers: string;
  maxPlayers: string;
  playTimeMinutes: string;
  weight: string;
  imageUrl: string;
  description: string;
  mechanics: string;
  explainerVideoUrl: string;
};

export const EMPTY_BOARD_GAME_FORM: BoardGameFormValues = {
  title: "",
  ean: "",
  condition: "",
  bggId: "",
  minPlayers: "",
  maxPlayers: "",
  playTimeMinutes: "",
  weight: "",
  imageUrl: "",
  description: "",
  mechanics: "",
  explainerVideoUrl: "",
};

/** The subset of a BoardGame record needed to seed the edit form. */
export type BoardGameRecord = {
  title: string;
  ean: string | null;
  condition: string | null;
  bggId: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  playTimeMinutes: number | null;
  weight: number | null;
  imageUrl: string | null;
  description: string | null;
  mechanics: string[];
  explainerVideoUrl: string | null;
};

export function boardGameToFormValues(
  game: BoardGameRecord,
): BoardGameFormValues {
  return {
    title: game.title,
    ean: game.ean ?? "",
    condition: game.condition ?? "",
    bggId: game.bggId?.toString() ?? "",
    minPlayers: game.minPlayers?.toString() ?? "",
    maxPlayers: game.maxPlayers?.toString() ?? "",
    playTimeMinutes: game.playTimeMinutes?.toString() ?? "",
    weight: game.weight?.toString() ?? "",
    imageUrl: game.imageUrl ?? "",
    description: game.description ?? "",
    mechanics: formatMechanics(game.mechanics),
    explainerVideoUrl: game.explainerVideoUrl ?? "",
  };
}

export function boardGameFormToInput(
  form: BoardGameFormValues,
): BoardGameInput {
  return {
    title: form.title,
    ean: form.ean || undefined,
    condition: form.condition || undefined,
    bggId: form.bggId ? parseBggId(form.bggId) : undefined,
    minPlayers: form.minPlayers ? Number(form.minPlayers) : undefined,
    maxPlayers: form.maxPlayers ? Number(form.maxPlayers) : undefined,
    playTimeMinutes: form.playTimeMinutes
      ? Number(form.playTimeMinutes)
      : undefined,
    weight: form.weight ? Number(form.weight) : undefined,
    imageUrl: form.imageUrl || undefined,
    description: form.description || undefined,
    mechanics: parseMechanics(form.mechanics),
    explainerVideoUrl: form.explainerVideoUrl || undefined,
  };
}

/**
 * Every manually editable BoardGame field — used by both the create dialog's
 * manual mode and the edit dialog, so a schema change only needs one edit.
 */
export function BoardGameFormFields({
  idPrefix,
  values,
  onChange,
  includeTitleAndCore = true,
}: {
  idPrefix: string;
  values: BoardGameFormValues;
  onChange: (patch: Partial<BoardGameFormValues>) => void;
  /** Set to false when the caller already renders title/EAN/condition itself. */
  includeTitleAndCore?: boolean;
}) {
  return (
    <>
      {includeTitleAndCore && (
        <>
          <TextField
            id={`${idPrefix}-title`}
            label="Titel"
            value={values.title}
            onChange={(event) => onChange({ title: event.target.value })}
            required
          />
          <TextField
            id={`${idPrefix}-ean`}
            label="EAN"
            value={values.ean}
            onChange={(event) => onChange({ ean: event.target.value })}
            placeholder="optional, vom Barcode auf der Schachtel"
            hint="Mehrere Spiele desselben Titels dürfen dieselbe EAN tragen."
          />
          <TextField
            id={`${idPrefix}-condition`}
            label="Zustand"
            value={values.condition}
            onChange={(event) => onChange({ condition: event.target.value })}
          />
        </>
      )}
      <TextField
        id={`${idPrefix}-bgg-id`}
        label="BGG-ID"
        value={values.bggId}
        onChange={(event) => onChange({ bggId: event.target.value })}
        placeholder="optional, z. B. 342942"
      />
      <div className="flex gap-3">
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
      </div>
      <TextField
        id={`${idPrefix}-weight`}
        label="Komplexität (1–5)"
        type="number"
        min={1}
        max={5}
        step={0.1}
        value={values.weight}
        onChange={(event) => onChange({ weight: event.target.value })}
      />
      <TextField
        id={`${idPrefix}-image-url`}
        label="Bild-URL"
        value={values.imageUrl}
        onChange={(event) => onChange({ imageUrl: event.target.value })}
        placeholder="https://…"
      />
      <TextAreaField
        id={`${idPrefix}-description`}
        label="Beschreibung"
        value={values.description}
        onChange={(event) => onChange({ description: event.target.value })}
      />
      <TextField
        id={`${idPrefix}-mechanics`}
        label="Mechaniken"
        value={values.mechanics}
        onChange={(event) => onChange({ mechanics: event.target.value })}
        placeholder="Worker Placement, Drafting, …"
        hint="Kommagetrennt."
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
    </>
  );
}
