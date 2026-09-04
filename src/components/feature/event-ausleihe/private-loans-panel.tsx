"use client";

import { ActionButton } from "@/components/ui/action-button";
import { MeepleAvatar } from "@/components/entities/meeple-avatar";
import { ContactDialog } from "@/components/entities/contact-dialog";
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
    <div className="bg-card flex flex-col gap-3 rounded-lg border p-5 lg:col-span-2">
      <h2 className="font-serif text-lg font-bold">
        Private Exemplare für dieses Event
      </h2>
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
                <ContactDialog
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
    </div>
  );
}
