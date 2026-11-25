import { ExternalLink } from "lucide-react";
import { bggGameUrl } from "@/lib/bgg/url";

/** Spieltitel, mit Link zur BGG-Seite (externer Tab), sofern das Spiel eine
 * BGG-ID hat. */
export function GameTitleLink({
  title,
  bggId,
}: {
  title: string;
  bggId: number | null;
}) {
  const href = bggGameUrl(bggId);
  if (!href) return <span className="font-medium">{title}</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-medium hover:underline"
    >
      {title}
      <ExternalLink className="text-muted-foreground size-3 shrink-0" />
    </a>
  );
}
