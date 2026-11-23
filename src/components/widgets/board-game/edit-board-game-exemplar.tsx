import { TextField } from "@/components/ui/field";
import { RuleBookLanguagesField } from "@/components/widgets/board-game/rule-book-languages-field";
import { EditionFields } from "@/components/widgets/board-game/edition-fields";
import type { BggVersion } from "@/lib/bgg/client";
import type { BoardGameFormValues } from "@/components/widgets/board-game/board-game-form-values";

/**
 * Per-copy field(s) — Mängelvermerk/condition, die Regelheft-Sprache(n)
 * (#188) und die Edition (Verlag/Sprache). Split out from the title fields
 * because it belongs to one physical `GameCopy`, not the shared title (see
 * ADR 0008).
 */
export function EditBoardGameExemplar({
  idPrefix,
  values,
  onChange,
  boardGameId,
  bggVersions,
  onSelectBggVersion,
}: {
  idPrefix: string;
  values: BoardGameFormValues;
  onChange: (patch: Partial<BoardGameFormValues>) => void;
  /** Titel, dessen vorhandene Editionen zur Auswahl stehen — fehlt beim
   * Anlegen eines ganz neuen Titels. */
  boardGameId?: string;
  /** Versionen der BGG-Vorschau — nur im Anlegen-Wizard. */
  bggVersions?: BggVersion[];
  onSelectBggVersion?: (version: BggVersion) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <TextField
        id={`${idPrefix}-condition`}
        label="Mängelvermerk"
        value={values.condition}
        onChange={(event) => onChange({ condition: event.target.value })}
      />
      <RuleBookLanguagesField
        idPrefix={idPrefix}
        value={values.ruleBookLanguages}
        onChange={(ruleBookLanguages) => onChange({ ruleBookLanguages })}
      />
      <EditionFields
        idPrefix={idPrefix}
        values={values}
        onChange={onChange}
        boardGameId={boardGameId}
        bggVersions={bggVersions}
        onSelectBggVersion={onSelectBggVersion}
      />
    </div>
  );
}
