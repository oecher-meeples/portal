import { StatusPill } from "@/components/ui/status-pill";
import { GameHoldingPanel } from "@/components/widgets/game-holding/game-holding-panel";
import type { HoldingHistoryEntry } from "@/components/feature/ludothek/game-detail-view";

/**
 * One exemplar's aufenthalt-actions + its own history — the content behind
 * each row's accordion toggle in the merged Exemplare-Bereich (Plan-Schritt
 * 6). Split out of `GameCopiesSection` purely for file-size, not reuse.
 */
export function GameCopyExpandedDetails({
  gameCopyId,
  history,
}: {
  gameCopyId: string;
  history: HoldingHistoryEntry[];
}) {
  return (
    <div className="flex flex-col gap-4 border-t pt-4">
      <GameHoldingPanel gameCopyId={gameCopyId} />

      {history.length > 0 && (
        <div>
          <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Aufenthalts-Historie
          </h3>
          <ul className="mt-2 flex flex-col divide-y text-sm">
            {history.map((entry) => (
              <li key={entry.id} className="flex flex-col gap-0.5 py-2">
                <span className="font-medium">
                  {entry.origin} → {entry.target}
                  {!entry.confirmedAt && (
                    <StatusPill
                      label="unbestätigt"
                      tone="warning"
                      className="ml-2"
                    />
                  )}
                </span>
                <span className="text-muted-foreground text-xs">
                  {entry.startedAt}
                  {entry.endedAt ? ` – ${entry.endedAt}` : " – aktuell"} ·
                  erfasst von {entry.recordedByName}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
