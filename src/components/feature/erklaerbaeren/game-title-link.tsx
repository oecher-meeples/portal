import Link from "next/link";
import { ExternalLink } from "lucide-react";

/** Spieltitel mit Link zur Spieldetailseite der Ludothek. */
export function GameTitleLink({
  title,
  slug,
}: {
  title: string;
  slug: string;
}) {
  return (
    <Link
      href={`/ludothek/${slug}`}
      className="inline-flex items-center gap-1 font-medium hover:underline"
    >
      {title}
      <ExternalLink className="text-muted-foreground size-3 shrink-0" />
    </Link>
  );
}
