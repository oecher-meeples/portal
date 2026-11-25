import Link from "next/link";
import { ExternalLink } from "lucide-react";

/** Spieltitel mit Link zur Spieldetailseite der Ludothek, darunter der
 * Zweittitel, sofern vorhanden. */
export function GameTitleLink({
  title,
  secondaryTitle,
  slug,
}: {
  title: string;
  secondaryTitle?: string | null;
  slug: string;
}) {
  return (
    <span className="flex min-w-0 flex-col">
      <Link
        href={`/ludothek/${slug}`}
        className="inline-flex items-center gap-1 font-medium hover:underline"
      >
        {title}
        <ExternalLink className="text-muted-foreground size-3 shrink-0" />
      </Link>
      {secondaryTitle && (
        <span className="text-muted-foreground truncate text-xs">
          {secondaryTitle}
        </span>
      )}
    </span>
  );
}
