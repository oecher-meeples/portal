import { TextField } from "@/components/ui/field";
import type { BoardGameFormValues } from "@/components/widgets/board-game/board-game-form-values";

/**
 * Per-copy field(s) — currently just the Mängelvermerk/condition note. Split
 * out from the title fields because it belongs to one physical `GameCopy`,
 * not the shared title (see ADR 0008).
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
    <TextField
      id={`${idPrefix}-condition`}
      label="Zustand"
      value={values.condition}
      onChange={(event) => onChange({ condition: event.target.value })}
    />
  );
}
