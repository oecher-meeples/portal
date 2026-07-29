import { Badge } from "@/components/ui/badge";
import { EXPLAINER_EXPERIENCE_LEVEL_LABELS } from "@/lib/format";
import type { ExplainerExperienceLevel } from "@prisma/client";

export type ExplainerDirectoryEntry = {
  boardGameId: string;
  boardGameTitle: string;
  explainers: {
    meepleId: string;
    displayName: string;
    level: ExplainerExperienceLevel;
  }[];
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
          <div className="flex flex-wrap items-center gap-2">
            {entry.explainers.map((explainer) => (
              <span
                key={explainer.meepleId}
                className="flex items-center gap-1.5 text-sm"
              >
                {explainer.displayName}
                <Badge variant="secondary">
                  {EXPLAINER_EXPERIENCE_LEVEL_LABELS[explainer.level]}
                </Badge>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
