"use client";

import { useState } from "react";
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
import {
  CONTRIBUTION_CATEGORY_LABELS,
  type ContributionCategory,
} from "@/lib/members/contribution";
import { nextContributionFilter } from "@/components/feature/admin-mitglieder/contribution-filter";
import {
  InvitesSection,
  type InviteRow,
} from "@/components/feature/admin-mitglieder/invites-section";
import { AnonymiseMeepleDialog } from "@/components/feature/admin-mitglieder/anonymise-meeple-dialog";
import { AnonymisationExplanation } from "@/components/entities/anonymisation-explanation";
import { HelpDialog } from "@/components/ui/help-dialog";
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
import { PageContainer } from "@/components/ui/page-container";

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
  canManageMembers,
  canManageRoles,
  canManageInvites,
  canReadBankData,
  isDecemberOrLater,
  deletionRequests,
  invites,
  membersWithoutLogin,
  defaultInviteDays,
  canCreateSystemkonto,
  canManageSystemAccounts,
  pendingEmailChanges,
  stufe3Candidates,
}: {
  members: VereinsmitgliedRow[];
  meeples: MeepleRow[];
  roles: RoleManagementRow[];
  permissions: PermissionOption[];
  /** = `members:manage` — Vereinsmitglied-CRUD (Erstellen-Button,
   * Einladen bleibt separat auf `invites:manage` gegated, #365). */
  canManageMembers: boolean;
  /** = `roles:manage` (#365) — bewusst getrennt von `members:manage`, blendet
   * die Rollenverwaltung aus. Die Actions selbst sind zusätzlich
   * serverseitig gegated (#216). */
  canManageRoles: boolean;
  /** = `invites:manage` (#365) — blendet den "Einladen"-Button aus, sonst
   * sieht ihn ein `members:manage`-only-Admin und bekommt beim Klick nur
   * einen Server-Fehler. */
  canManageInvites: boolean;
  canReadBankData: boolean;
  isDecemberOrLater: boolean;
  deletionRequests: DeletionRequestRow[];
  invites: InviteRow[];
  membersWithoutLogin: MemberWithoutLoginRow[];
  defaultInviteDays: number;
  /** = `admin:access` — reused as-is for the Systemrollen-Gate in
   * `MeepleRoleSelect` (#353), not just for the Systemkonto button. */
  canCreateSystemkonto: boolean;
  /** = `members:manage-system-accounts` (#297) — blendet den Toggle zum
   * Setzen/Entfernen der System-Konto-Markierung im Meeple-Edit-Dialog aus. */
  canManageSystemAccounts: boolean;
  pendingEmailChanges: PendingChangeRow[];
  stufe3Candidates: {
    id: string;
    memberNumber: number;
    displayName: string;
    membershipEndsAt: string;
  }[];
}) {
  // Klick auf eine Beitragsart-Zahl filtert die Vereinsmitglieder-Tabelle
  // (#340, Verifikations-Kommentar zu #334) — "Meeple" bündelt meeple +
  // individuell (Eigenbetrag), da beide in derselben Zeile angezeigt werden.
  const [contributionFilter, setContributionFilter] = useState<
    ContributionCategory[] | null
  >(null);

  function toggleContributionFilter(categories: ContributionCategory[]) {
    setContributionFilter((current) =>
      nextContributionFilter(current, categories),
    );
  }

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

  const activeMembers = members.filter(
    (m) =>
      m.membershipState === "unregistriert" ||
      m.membershipState === "registriert",
  );
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
    <PageContainer className="gap-6">
      <PageHeading
        eyebrow="Onboarding & Lebenszyklus"
        title="Benutzer & Einladungen"
        description="Geschlossenes Registrierungssystem: eine Einladung ist ein Token ohne Personenbezug, der Meeple entsteht beim ersten Login."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="bg-card flex flex-col gap-3 rounded-lg border p-5">
          <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            Vereinsmitglieder
          </p>
          <div className="grid grid-cols-2 gap-2">
            <dl className="flex flex-col gap-1 text-sm">
              {(
                [
                  { key: "mini", categories: ["mini"] },
                  { key: "jung", categories: ["jung"] },
                  { key: "meeple", categories: ["meeple", "individuell"] },
                ] as const
              ).map(({ key, categories }) => {
                const count =
                  key === "meeple"
                    ? activeByContribution.meeple +
                      activeByContribution.individuell
                    : activeByContribution[key];
                const active =
                  contributionFilter?.join(",") === categories.join(",");
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      toggleContributionFilter([...categories]);
                      document
                        .getElementById("vereinsmitglieder")
                        ?.scrollIntoView({ block: "nearest" });
                    }}
                    className={cn(
                      "hover:text-foreground -mx-1 flex items-center justify-between gap-2 rounded-sm px-1 text-left",
                      active
                        ? "bg-primary/10 text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    <dt>{CONTRIBUTION_CATEGORY_LABELS[key]}</dt>
                    <dd className="font-mono">{count}</dd>
                  </button>
                );
              })}
            </dl>
            <a
              href="#vereinsmitglieder"
              className="hover:text-foreground flex flex-col items-center justify-center text-center"
            >
              <p className="font-serif text-3xl font-bold">{members.length}</p>
              <p className="text-muted-foreground mt-1 text-sm">insgesamt</p>
            </a>
          </div>
        </div>
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
          <div className="flex items-center gap-1">
            <h2 className="font-serif text-lg font-bold">
              Bereit zur Anonymisierung
            </h2>
            <HelpDialog title="Anonymisierung">
              <AnonymisationExplanation />
            </HelpDialog>
          </div>
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
        titleSingular="Offener E-Mail-Änderungsantrag"
        titlePlural="Offene E-Mail-Änderungsanträge"
        changes={pendingEmailChanges}
        isEmailChangePanel
      />

      {stufe3Candidates.length > 0 && (
        <div className="bg-card rounded-lg border p-5">
          <div className="flex items-center gap-1">
            <h2 className="font-serif text-lg font-bold">
              Bereit zur endgültigen Löschung (Stufe 3)
            </h2>
            <HelpDialog title="Anonymisierung">
              <AnonymisationExplanation />
            </HelpDialog>
          </div>
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

      <VereinsmitgliederTable
        members={members}
        canManageMembers={canManageMembers}
        canManageInvites={canManageInvites}
        isAdmin={canCreateSystemkonto}
        contributionFilter={contributionFilter}
        onClearContributionFilter={() => setContributionFilter(null)}
      />

      <MitgliederTable
        meeples={meeples}
        roles={roles}
        canReadBankData={canReadBankData}
        canManageAdminAccess={canCreateSystemkonto}
        canCreateSystemkonto={canCreateSystemkonto}
        canManageSystemAccounts={canManageSystemAccounts}
      />

      {canManageRoles && (
        <RoleManagementSection roles={roles} permissions={permissions} />
      )}

      <InvitesSection
        invites={invites}
        membersWithoutLogin={membersWithoutLogin}
        defaultDays={defaultInviteDays}
      />
    </PageContainer>
  );
}
