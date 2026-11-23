"use client";

import { ActionButton } from "@/components/ui/action-button";
import { Card, CardTitle } from "@/components/ui/card";
import { MeepleAvatar } from "@/components/entities/meeple-avatar";
import { MeepleContactDialog } from "@/components/widgets/contact/meeple-contact-dialog";
import {
  ausleiheIssuePrivateLoan,
  ausleiheReturnPrivateLoan,
} from "@/components/feature/event-ausleihe/ausleihe-actions";
import type { OfferedPrivateLoan } from "@/lib/ludothek/private-event-loans";

/**
 * Private Exemplare (#122), die Meeple für dieses Event zur Ausleihe
 * freigegeben haben — separat von `AusleiheView`s Scanner-Flow, da private
 * Exemplare keinen EAN/Einheiten-Code haben und daher nicht gescannt werden
 * können. Bekommt die Liste server-gerendert (`ausleihe/page.tsx`); die
 * `ActionButton`s aktualisieren sie über `router.refresh()` (Default von
 * `useAction()`), kein eigenes Client-Fetching nötig.
 */
export function PrivateLoansPanel({ loans }: { loans: OfferedPrivateLoan[] }) {
  if (loans.length === 0) return null;

  return (
    <Card className="lg:col-span-2">
      <CardTitle>Private Exemplare für dieses Event</CardTitle>
      <ul className="flex flex-col gap-2">
        {loans.map((loan) => (
          <li
            key={loan.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2.5 text-sm"
          >
            <span className="flex items-center gap-1.5">
              <span className="font-medium">{loan.boardGame.title}</span>
              <span className="text-muted-foreground flex items-center gap-1.5">
                — freigegeben von
                <MeepleAvatar
                  name={loan.owner.displayName}
                  profilePictureUrl={loan.owner.profilePictureUrl}
                  profilePictureVisibility={loan.owner.profilePictureVisibility}
                  viewer={{ kind: "meeple" }}
                  size="md"
                />
                <MeepleContactDialog
                  name={loan.owner.displayName}
                  meepleId={loan.owner.id}
                />
              </span>
            </span>
            {loan.status === "OFFERED" && (
              <ActionButton
                size="sm"
                action={ausleiheIssuePrivateLoan.bind(null, loan.id)}
              >
                Ausgeben
              </ActionButton>
            )}
            {loan.status === "LOANED" && (
              <ActionButton
                size="sm"
                variant="outline"
                action={ausleiheReturnPrivateLoan.bind(null, loan.id)}
              >
                Zurückgeben
              </ActionButton>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
