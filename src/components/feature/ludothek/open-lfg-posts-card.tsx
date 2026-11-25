import Link from "next/link";
import { CountAccordionCard } from "@/components/ui/count-accordion-card";
import type { OpenLfgPostForBoardGame } from "@/lib/content/lfg";
import { formatDateMedium } from "@/lib/utils/format";

/** „[X] Offene Spielergesuche" auf der Spieledetailseite (#34) — zugeklapptes
 * Akkordeon, nur für Meeple (LFG ist Mitgliederbereich); ohne Gesuche rendert
 * die Karte nichts. */
export function OpenLfgPostsCard({
  posts,
}: {
  posts: OpenLfgPostForBoardGame[];
}) {
  if (posts.length === 0) return null;
  return (
    <CountAccordionCard
      count={posts.length}
      label={
        posts.length === 1 ? "Offenes Spielergesuch" : "Offene Spielergesuche"
      }
    >
      <ul className="flex flex-col divide-y">
        {posts.map((post) => (
          <li key={post.id} className="flex flex-col gap-0.5 py-2.5">
            <Link
              href={`/lfg/${post.id}`}
              className="hover:text-primary font-medium"
            >
              {post.title}
            </Link>
            <span className="text-muted-foreground text-xs">
              {post.dateNote ??
                (post.plannedAt
                  ? formatDateMedium(post.plannedAt)
                  : "Termin offen")}
              {post.location ? ` · ${post.location}` : ""} ·{" "}
              {post.participantCount}/{post.maxParticipants}
            </span>
          </li>
        ))}
      </ul>
    </CountAccordionCard>
  );
}
