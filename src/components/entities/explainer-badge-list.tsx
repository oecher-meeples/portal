import { Badge } from "@/components/ui/badge";
import { EXPLAINER_EXPERIENCE_LEVEL_LABELS } from "@/lib/utils/format";
import type { ExplainerEntry } from "@/lib/explainer/queries";

/** Name + Erfahrungsstufen-Badge je Erklärbär — die eine Stelle, die das rendert. */
export function ExplainerBadgeList({
  explainers,
  emptyLabel = "Noch keine Erklärbären eingetragen.",
}: {
  explainers: ExplainerEntry[];
  emptyLabel?: string;
}) {
  if (explainers.length === 0) {
    return <p className="text-muted-foreground text-sm">{emptyLabel}</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {explainers.map((explainer) => (
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
  );
}
