import type { ContributorRole } from "@prisma/client";
import { Home, PenLine, Paintbrush } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const ROLE_ICON: Record<ContributorRole, typeof Home> = {
  PUBLISHER: Home,
  AUTHOR: PenLine,
  ILLUSTRATOR: Paintbrush,
};

/** Ein Mitwirkender: Name plus ein kleines Icon je Rolle, die er an diesem
 * Titel hat (z. B. Stift+Pinsel für jemanden, der zugleich Autor und
 * Illustrator ist). Anders als `ContributorRolePill` (eine Rolle für sich)
 * steht hier der Name im Vordergrund. */
export function ContributorPill({
  name,
  roles,
  className,
}: {
  name: string;
  roles: ContributorRole[];
  className?: string;
}) {
  return (
    <span
      className={cn(
        "bg-muted inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        className,
      )}
    >
      {name}
      <span className="text-muted-foreground flex items-center gap-0.5">
        {roles.map((role) => {
          const Icon = ROLE_ICON[role];
          return <Icon key={role} className="size-3" />;
        })}
      </span>
    </span>
  );
}
