import { ExplainerBadgeList } from "@/components/entities/explainer-badge-list";
import type { ExplainerEntry } from "@/lib/explainer/queries";

export type ExplainerDirectoryEntry = {
  boardGameId: string;
  boardGameTitle: string;
  explainers: ExplainerEntry[];
};

export function ExplainerDirectory({
  entries,
}: {
  entries: ExplainerDirectoryEntry[];
}) {
  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Noch keine Erklärbären für ein Spiel eingetragen.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {entries.map((entry) => (
        <div
          key={entry.boardGameId}
          className="bg-card flex flex-col gap-2 rounded-lg border p-4"
        >
          <p className="font-serif text-lg font-semibold">
            {entry.boardGameTitle}
          </p>
          <ExplainerBadgeList explainers={entry.explainers} />
        </div>
      ))}
    </div>
  );
}
