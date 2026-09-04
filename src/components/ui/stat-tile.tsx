import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { CARD_HOVER_CLASS } from "@/components/ui/card-hover";

function StatTileContent({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <>
      <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
        {label}
      </p>
      <p className="mt-2 font-serif text-3xl font-bold">{value}</p>
      {hint && <p className="text-muted-foreground mt-1 text-sm">{hint}</p>}
    </>
  );
}

/** Pass `href` to make the tile a link to where that number comes from
 * (e.g. a dashboard stat → the filtered list behind it, #224-Folge). */
export function StatTile({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
}) {
  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          "bg-card block h-full rounded-lg border p-5",
          CARD_HOVER_CLASS,
        )}
      >
        <StatTileContent label={label} value={value} hint={hint} />
      </Link>
    );
  }

  return (
    <div className="bg-card rounded-lg border p-5">
      <StatTileContent label={label} value={value} hint={hint} />
    </div>
  );
}
