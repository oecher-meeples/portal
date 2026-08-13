import { BoardGameKind } from "@prisma/client";
import { TextField, TextAreaField } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import type { BoardGameFormValues } from "@/components/widgets/board-game/board-game-form-values";

/**
 * Title-level fields — everything shared by every physical copy of this
 * title (see ADR 0008). `condition` lives in `EditBoardGameExemplar`
 * instead: it's per-copy, not per-title.
 */
export function EditBoardGameTitle({
  idPrefix,
  values,
  onChange,
}: {
  idPrefix: string;
  values: BoardGameFormValues;
  onChange: (patch: Partial<BoardGameFormValues>) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <TextField
        id={`${idPrefix}-title`}
        label="Titel"
        fieldClassName="sm:col-span-2"
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
          <option value={BoardGameKind.BOARDGAME_EXPANSION}>
            Erweiterung
          </option>
        </select>
      </div>
      <TextField
        id={`${idPrefix}-bgg-id`}
        label="BGG-ID"
        fieldClassName="sm:col-span-2"
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
        fieldClassName="sm:col-span-2"
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
    </div>
  );
}
