import { StatusPill } from "@/components/ui/status-pill";
import { HistoryList } from "@/components/ui/history-list";
import { GameCopyCheckResultPill } from "@/components/entities/game-copy-check-result-pill";
import { GameHoldingPanel } from "@/components/widgets/game-holding/game-holding-panel";
import type { CopyHistory } from "@/lib/ludothek/copy-history";

/**
 * One exemplar's aufenthalt-actions + its own histories — the content behind
 * each row's accordion toggle in the merged Exemplare-Bereich (Plan-Schritt
 * 6). Split out of `GameCopiesSection` purely for file-size, not reuse.
 * Die Kontroll-Historie (#599) kommt nur für `games:manage` mit
 * (`history.checks !== null`).
 */
export function GameCopyExpandedDetails({
  gameCopyId,
  history,
}: {
  gameCopyId: string;
  history: CopyHistory;
}) {
  return (
    <div className="flex flex-col gap-4 border-t pt-4">
      <GameHoldingPanel gameCopyId={gameCopyId} />

      {history.holdings.length > 0 && (
        <HistoryList
          title="Aufenthalts-Historie"
          items={history.holdings}
          hint={
            history.holdingsTruncated
              ? "Ältere Aufenthalte werden nicht angezeigt."
              : undefined
          }
          renderItem={(entry) => (
            <>
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
                {entry.endedAt ? ` – ${entry.endedAt}` : " – aktuell"} · erfasst
                von {entry.recordedByName}
              </span>
            </>
          )}
        />
      )}

      {history.checks && history.checks.length > 0 && (
        <HistoryList
          title="Kontroll-Historie"
          items={history.checks}
          renderItem={(check) => (
            <>
              <span className="flex flex-wrap items-center gap-2">
                <GameCopyCheckResultPill result={check.result} />
                {check.note && <span className="min-w-0">{check.note}</span>}
              </span>
              <span className="text-muted-foreground text-xs">
                {check.checkedAt} · kontrolliert von {check.checkedByName}
              </span>
            </>
          )}
        />
      )}
    </div>
  );
}
