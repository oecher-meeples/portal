import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import {
  GAME_COPY_CHECK_RESULT_LABELS,
  type GameCopyCheckResultKey,
} from "@/lib/ludothek/game-issue";

const TONES: Record<GameCopyCheckResultKey, StatusTone> = {
  COMPLETE: "positive",
  INCOMPLETE: "warning",
  DAMAGED: "warning",
  UNPLAYABLE: "negative",
};

/** The one place that knows how a copy check's result looks (#599). */
export function GameCopyCheckResultPill({
  result,
}: {
  result: GameCopyCheckResultKey;
}) {
  return (
    <StatusPill
      label={GAME_COPY_CHECK_RESULT_LABELS[result]}
      tone={TONES[result]}
    />
  );
}
