import { TextField } from "@/components/ui/field";
import { RuleBookLanguagesField } from "@/components/widgets/board-game/rule-book-languages-field";
import type { BoardGameFormValues } from "@/components/widgets/board-game/board-game-form-values";

/**
 * Per-copy field(s) — Mängelvermerk/condition und die Regelheft-Sprache(n)
 * (#188). Split out from the title fields because it belongs to one physical
 * `GameCopy`, not the shared title (see ADR 0008).
 */
export function EditBoardGameExemplar({
  idPrefix,
  values,
  onChange,
}: {
  idPrefix: string;
  values: BoardGameFormValues;
  onChange: (patch: Partial<BoardGameFormValues>) => void;
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
    </div>
  );
}
