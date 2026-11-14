import type { ContributorRole } from "@prisma/client";
import { Home, PenLine, Paintbrush } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { CONTRIBUTOR_ROLE_LABELS } from "@/lib/ludothek/taxonomy/contributor-labels";

const ROLE_ICON: Record<ContributorRole, typeof Home> = {
  PUBLISHER: Home,
  AUTHOR: PenLine,
  ILLUSTRATOR: Paintbrush,
};

const ROLE_TONE: Record<ContributorRole, string> = {
  PUBLISHER: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  AUTHOR: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  ILLUSTRATOR: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
};

/** Eine Rolle (Verlag/Autor/Illustrator) als Icon+Farbe-Chip — die eine
 * Stelle, die weiß, welches Icon und welche Farbe zu welcher Rolle gehört.
 * Überall verwenden, wo eine Mitwirkenden-Rolle angezeigt wird. */
export function ContributorRolePill({
  role,
  className,
}: {
  role: ContributorRole;
  className?: string;
}) {
  const Icon = ROLE_ICON[role];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        ROLE_TONE[role],
        className,
      )}
    >
      <Icon className="size-3" />
      {CONTRIBUTOR_ROLE_LABELS[role]}
    </span>
  );
}
