"use client";

import type { ReactNode } from "react";
import { CountAccordionCard } from "@/components/ui/count-accordion-card";
import { MeepleAvatar } from "@/components/entities/meeple-avatar";
import { MeepleContactDialog } from "@/components/widgets/contact/meeple-contact-dialog";
import type { SharedCollectionMeeple } from "@/lib/ludothek/shared-collection-meeples";

/** „(X) Meeple möchten das spielen" auf der Spieledetailseite (#632-Folge) —
 * zugeklapptes Akkordeon, aufgeklappt ein Grid aus Profilbild und Name, der
 * den Kontakt-Dialog öffnet. Nur eingeloggten Meeple gezeigt (der Aufrufer
 * übergibt die Liste nur dann); ohne Einträge rendert die Karte nichts. */
export function SharedCollectionMeeplesCard({
  meeples,
  singularLabel,
  pluralLabel,
  action,
  showWhenEmpty = false,
}: {
  meeples: SharedCollectionMeeple[];
  /** Text hinter dem Zähler-Badge bei genau einem Meeple. */
  singularLabel: string;
  /** Text hinter dem Zähler-Badge bei mehreren Meeple. */
  pluralLabel: string;
  /** Button oben rechts im aufgeklappten Bereich. */
  action?: ReactNode;
  /** Auch ohne Einträge zeigen — nötig, wenn `action` die erste Markierung
   * setzen soll. */
  showWhenEmpty?: boolean;
}) {
  if (meeples.length === 0 && !showWhenEmpty) return null;
  const label = meeples.length === 1 ? singularLabel : pluralLabel;

  return (
    <CountAccordionCard count={meeples.length} label={label}>
      {action && <div className="mb-3 flex justify-end">{action}</div>}
      {meeples.length === 0 && (
        <p className="text-muted-foreground text-sm">Noch niemand.</p>
      )}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {meeples.map((meeple) => (
          <li key={meeple.meepleId} className="flex items-center gap-2">
            <MeepleAvatar
              name={meeple.name}
              profilePictureUrl={meeple.profilePictureUrl}
              profilePictureVisibility={meeple.profilePictureVisibility}
              viewer={{ kind: "meeple" }}
              size="lg"
            />
            <MeepleContactDialog
              name={meeple.name}
              meepleId={meeple.meepleId}
              className="min-w-0 truncate text-left"
            />
          </li>
        ))}
      </ul>
    </CountAccordionCard>
  );
}
