"use client";

import { PageHeading } from "@/components/ui/page-heading";
import { StatTile } from "@/components/ui/stat-tile";
import {
  MitgliederTable,
  type MeepleRow,
} from "@/components/feature/admin-mitglieder/mitglieder-table";
import type { RoleOption } from "@/components/feature/admin-mitglieder/meeple-role-select";
import {
  InvitesSection,
  type InviteRow,
} from "@/components/feature/admin-mitglieder/invites-section";
import { AnonymiseMeepleDialog } from "@/components/feature/admin-mitglieder/anonymise-meeple-dialog";
import { formatDatePlain } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export type { MeepleRow, InviteRow };

export type DeletionRequestRow = {
  id: string;
  meepleId: string;
  displayName: string;
  requestedAt: string;
  deadlineAt: string;
  daysRemaining: number;
  overdue: boolean;
};

function germanDate(value: string | null) {
  return value ? formatDatePlain(value) : "—";
}

export function AdminMitgliederView({
  meeples,
  roles,
  canReadBankData,
  isDecemberOrLater,
  deletionRequests,
  invites,
}: {
  meeples: MeepleRow[];
  roles: RoleOption[];
  canReadBankData: boolean;
  isDecemberOrLater: boolean;
  deletionRequests: DeletionRequestRow[];
  invites: InviteRow[];
}) {
  const withOpenHoldings = meeples.filter(
    (m) =>
      m.membershipState === "gekuendigt" &&
      (m.openGames > 0 || m.openUnits > 0),
  );
  const readyForAnonymisation = meeples.filter(
    (m) =>
      m.membershipState === "ausgetreten" &&
      m.openGames === 0 &&
      m.openUnits === 0,
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Onboarding & Lebenszyklus"
        title="Mitglieder & Einladungen"
        description="Geschlossenes Registrierungssystem: eine Einladung ist ein Token ohne Personenbezug, der Meeple entsteht beim ersten Login."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Mitglieder" value={meeples.length} hint="insgesamt" />
        <StatTile
          label="Kündigungen mit Bestand"
          value={withOpenHoldings.length}
          hint={isDecemberOrLater ? "ab Dezember relevant" : undefined}
        />
        <StatTile
          label="Bereit zur Anonymisierung"
          value={readyForAnonymisation.length}
          hint="ausgetreten, ohne Bestand"
        />
      </div>

      {deletionRequests.length > 0 && (
        <div
          className={cn(
            "bg-card rounded-lg border p-5",
            deletionRequests.some((request) => request.overdue) &&
              "border-destructive/50",
          )}
        >
          <h2 className="font-serif text-lg font-bold">
            Löschanträge (Art. 17 DSGVO)
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Jeder Antrag muss binnen eines Monats bearbeitet sein (Art. 12 Abs.
            3 DSGVO). Erledigt wird er durch die Anonymisierung des Mitglieds.
          </p>
          <ul className="mt-3 flex flex-col divide-y text-sm">
            {deletionRequests.map((request) => (
              <li
                key={request.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2"
              >
                <span>{request.displayName}</span>
                <span
                  className={cn(
                    "text-muted-foreground",
                    request.overdue && "text-destructive font-medium",
                  )}
                >
                  beantragt {germanDate(request.requestedAt)} · Frist{" "}
                  {germanDate(request.deadlineAt)} ·{" "}
                  {request.overdue
                    ? `${Math.abs(request.daysRemaining)} Tage überfällig`
                    : `${request.daysRemaining} Tage verbleiben`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {withOpenHoldings.length > 0 && (
        <div
          className={cn(
            "bg-card rounded-lg border p-5",
            isDecemberOrLater && "border-amber-500/50",
          )}
        >
          <h2 className="font-serif text-lg font-bold">
            Kündigungen mit offenen Beständen
          </h2>
          <ul className="mt-3 flex flex-col divide-y text-sm">
            {withOpenHoldings.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2">
                <span>{m.displayName}</span>
                <span className="text-muted-foreground">
                  {m.openGames} Spiele · {m.openUnits} Einheiten · Austritt{" "}
                  {germanDate(m.membershipEndsAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {readyForAnonymisation.length > 0 && (
        <div className="bg-card rounded-lg border p-5">
          <h2 className="font-serif text-lg font-bold">
            Bereit zur Anonymisierung
          </h2>
          <ul className="mt-3 flex flex-col divide-y text-sm">
            {readyForAnonymisation.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2">
                <span>{m.displayName}</span>
                <AnonymiseMeepleDialog
                  meepleId={m.id}
                  displayName={m.displayName}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      <MitgliederTable
        meeples={meeples}
        roles={roles}
        canReadBankData={canReadBankData}
      />

      <InvitesSection invites={invites} />
    </div>
  );
}
