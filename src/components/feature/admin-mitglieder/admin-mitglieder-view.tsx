import { RotateCcw } from "lucide-react";
import { PageHeading } from "@/components/ui/page-heading";
import { StatTile } from "@/components/ui/stat-tile";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDatePlain } from "@/lib/utils/format";
import { MembershipStatePill } from "@/components/entities/membership-state-pill";
import { InviteStatusPill } from "@/components/entities/invite-status-pill";
import type { MembershipState } from "@/lib/members/meeples";
import type { InviteStatus } from "@/lib/members/invites";
import { ActionButton } from "@/components/ui/action-button";
import { InviteForm } from "@/components/feature/admin-mitglieder/invite-form";
import { AnonymiseMeepleDialog } from "@/components/feature/admin-mitglieder/anonymise-meeple-dialog";
import { ResignMembershipDialog } from "@/components/feature/admin-mitglieder/resign-membership-dialog";
import { revokeResignation } from "@/components/feature/admin-mitglieder/actions";
import { revokeInvite } from "@/components/feature/admin-mitglieder/invite-actions";
import { cn } from "@/lib/utils/cn";

export type MeepleRow = {
  id: string;
  memberNumber: number;
  displayName: string;
  roles: string[];
  membershipState: MembershipState;
  joinedAt: string;
  resignedAt: string | null;
  membershipEndsAt: string | null;
  openGames: number;
  openUnits: number;
};

export type InviteRow = {
  id: string;
  token: string;
  createdByDisplayName: string;
  createdAt: string;
  expiresAt: string;
  redeemedAt: string | null;
  status: InviteStatus;
};

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
  isDecemberOrLater,
  deletionRequests,
  invites,
}: {
  meeples: MeepleRow[];
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

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Nr.</TableHead>
              <TableHead>Mitglied</TableHead>
              <TableHead>Rollen</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Beigetreten</TableHead>
              <TableHead>Kündigung / Austritt</TableHead>
              <TableHead className="text-right"> </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {meeples.map((meeple) => (
              <TableRow key={meeple.id}>
                <TableCell className="font-mono">
                  {meeple.memberNumber}
                </TableCell>
                <TableCell
                  className={
                    meeple.membershipState === "anonymisiert"
                      ? "text-muted-foreground"
                      : "font-medium"
                  }
                >
                  {meeple.displayName}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {meeple.roles.length > 0 ? meeple.roles.join(", ") : "—"}
                </TableCell>
                <TableCell>
                  <MembershipStatePill state={meeple.membershipState} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {germanDate(meeple.joinedAt)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {meeple.resignedAt
                    ? `${germanDate(meeple.resignedAt)} → ${germanDate(meeple.membershipEndsAt)}`
                    : "—"}
                </TableCell>
                <TableCell className="text-right">
                  {meeple.membershipState === "anonymisiert" ? (
                    <span className="text-muted-foreground text-sm">
                      Historie erhalten
                    </span>
                  ) : meeple.resignedAt ? (
                    <ActionButton
                      variant="outline"
                      size="sm"
                      action={revokeResignation.bind(null, meeple.id)}
                      pendingLabel="Widerrufe…"
                    >
                      <RotateCcw />
                      Kündigung widerrufen
                    </ActionButton>
                  ) : (
                    <ResignMembershipDialog
                      meepleId={meeple.id}
                      displayName={meeple.displayName}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="font-serif text-lg font-bold">
          Neues Mitglied einladen
        </h2>
        <div className="max-w-sm">
          <InviteForm />
        </div>

        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Erzeugt von</TableHead>
                <TableHead>Erzeugt am</TableHead>
                <TableHead>Läuft ab / eingelöst am</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right"> </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invites.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-muted-foreground text-center"
                  >
                    Noch keine Einladungen erzeugt.
                  </TableCell>
                </TableRow>
              )}
              {invites.map((invite) => (
                <TableRow key={invite.id}>
                  <TableCell className="font-medium">
                    {invite.createdByDisplayName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {germanDate(invite.createdAt)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {invite.redeemedAt
                      ? germanDate(invite.redeemedAt)
                      : germanDate(invite.expiresAt)}
                  </TableCell>
                  <TableCell>
                    <InviteStatusPill status={invite.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {invite.status === "offen" && (
                      <ActionButton
                        variant="ghost"
                        size="sm"
                        action={revokeInvite.bind(null, invite.id)}
                        pendingLabel="Widerrufe…"
                        confirm="Diese Einladung wirklich widerrufen? Der Link funktioniert danach nicht mehr."
                      >
                        Widerrufen
                      </ActionButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
