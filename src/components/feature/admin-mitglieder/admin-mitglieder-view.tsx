"use client";

import { PageHeading } from "@/components/ui/page-heading";
import { StatTile } from "@/components/ui/stat-tile";
import {
  MitgliederTable,
  type MeepleRow,
} from "@/components/feature/admin-mitglieder/mitglieder-table";
import {
  VereinsmitgliederTable,
  type VereinsmitgliedRow,
} from "@/components/feature/admin-mitglieder/vereinsmitglieder-table";
import { CONTRIBUTION_CATEGORY_LABELS } from "@/lib/members/contribution";
import {
  InvitesSection,
  type InviteRow,
} from "@/components/feature/admin-mitglieder/invites-section";
import { AnonymiseMeepleDialog } from "@/components/feature/admin-mitglieder/anonymise-meeple-dialog";
import { SystemkontoDialog } from "@/components/feature/admin-mitglieder/systemkonto-dialog";
import { DeleteMemberDialog } from "@/components/feature/admin-mitglieder/delete-member-dialog";
import {
  RoleManagementSection,
  type RoleManagementRow,
} from "@/components/feature/admin-mitglieder/role-management-section";
import type { PermissionOption } from "@/components/feature/admin-mitglieder/role-permissions-editor";
import type { MemberWithoutLoginRow } from "@/lib/members/members-without-login";
import {
  PendingChangesPanel,
  type PendingChangeRow,
} from "@/components/widgets/pending-changes/pending-changes-panel";
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
  members,
  meeples,
  roles,
  permissions,
  canManageRoles,
  canReadBankData,
  isDecemberOrLater,
  deletionRequests,
  invites,
  membersWithoutLogin,
  defaultInviteDays,
  canCreateSystemkonto,
  pendingEmailChanges,
  stufe3Candidates,
}: {
  members: VereinsmitgliedRow[];
  meeples: MeepleRow[];
  roles: RoleManagementRow[];
  permissions: PermissionOption[];
  /** Blendet die Rollenverwaltung aus — die Actions selbst sind zusätzlich serverseitig gegated (#216). */
  canManageRoles: boolean;
  canReadBankData: boolean;
  isDecemberOrLater: boolean;
  deletionRequests: DeletionRequestRow[];
  invites: InviteRow[];
  membersWithoutLogin: MemberWithoutLoginRow[];
  defaultInviteDays: number;
  canCreateSystemkonto: boolean;
  pendingEmailChanges: PendingChangeRow[];
  stufe3Candidates: {
    id: string;
    memberNumber: number;
    displayName: string;
    membershipEndsAt: string;
  }[];
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

  const activeMembers = members.filter((m) => m.membershipState === "aktiv");
  const activeByContribution = {
    mini: activeMembers.filter((m) => m.contributionCategory === "mini").length,
    jung: activeMembers.filter((m) => m.contributionCategory === "jung").length,
    meeple: activeMembers.filter((m) => m.contributionCategory === "meeple")
      .length,
    individuell: activeMembers.filter(
      (m) => m.contributionCategory === "individuell",
    ).length,
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Onboarding & Lebenszyklus"
        title="Mitglieder & Einladungen"
        description="Geschlossenes Registrierungssystem: eine Einladung ist ein Token ohne Personenbezug, der Meeple entsteht beim ersten Login."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Vereinsmitglieder"
          value={members.length}
          hint="insgesamt"
        />
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

      <a
        href="#vereinsmitglieder"
        className="bg-card hover:bg-muted/50 block rounded-lg border p-5 transition-colors"
      >
        <h2 className="font-serif text-lg font-bold">
          Aktive Mitglieder — {activeMembers.length}
        </h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">
              {CONTRIBUTION_CATEGORY_LABELS.mini}
            </dt>
            <dd className="font-mono">{activeByContribution.mini}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">
              {CONTRIBUTION_CATEGORY_LABELS.jung}
            </dt>
            <dd className="font-mono">{activeByContribution.jung}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">
              {CONTRIBUTION_CATEGORY_LABELS.meeple}
            </dt>
            <dd className="font-mono">{activeByContribution.meeple}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">
              {CONTRIBUTION_CATEGORY_LABELS.individuell}
            </dt>
            <dd className="font-mono">{activeByContribution.individuell}</dd>
          </div>
        </dl>
      </a>

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

      <PendingChangesPanel
        title="Offene E-Mail-Änderungsanträge"
        changes={pendingEmailChanges}
      />

      {stufe3Candidates.length > 0 && (
        <div className="bg-card rounded-lg border p-5">
          <h2 className="font-serif text-lg font-bold">
            Bereit zur endgültigen Löschung (Stufe 3)
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            12 Monate seit Austritt vergangen, keine offenen Ausleihen mehr.
          </p>
          <ul className="mt-3 flex flex-col divide-y text-sm">
            {stufe3Candidates.map((member) => (
              <li
                key={member.id}
                className="flex items-center justify-between py-2"
              >
                <span>
                  #{member.memberNumber} {member.displayName}
                </span>
                <DeleteMemberDialog
                  memberId={member.id}
                  displayName={member.displayName}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {canManageRoles && (
        <RoleManagementSection roles={roles} permissions={permissions} />
      )}

      <VereinsmitgliederTable
        members={members}
        defaultInviteDays={defaultInviteDays}
      />

      {canCreateSystemkonto && (
        <div className="flex justify-end">
          <SystemkontoDialog />
        </div>
      )}

      <MitgliederTable
        meeples={meeples}
        roles={roles}
        canReadBankData={canReadBankData}
      />

      <InvitesSection
        invites={invites}
        membersWithoutLogin={membersWithoutLogin}
        defaultDays={defaultInviteDays}
      />
    </div>
  );
}
