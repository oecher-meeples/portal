import Link from "next/link";
import { cn } from "@/lib/utils/cn";

/** Toggle-Filter als Link-Pill — Zustand kommt aus der URL (`href` trägt den
 * gepatchten Query-String), kein eigener Client-State. Fachfrei, aus
 * `ludothek-filter-panel.tsx` ausgelagert (Datei riss sonst die
 * 400-Zeilen-Grenze). */
export function FilterPill({
  label,
  href,
  active,
  className,
}: {
  label: string;
  href: string;
  active: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      {label}
    </Link>
  );
}
