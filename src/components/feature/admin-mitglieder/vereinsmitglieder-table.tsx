"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { RotateCcw, Search, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ActionButton } from "@/components/ui/action-button";
import { MembershipStatePill } from "@/components/entities/membership-state-pill";
import { ResignMembershipDialog } from "@/components/feature/admin-mitglieder/resign-membership-dialog";
import { AnonymiseMeepleDialog } from "@/components/feature/admin-mitglieder/anonymise-meeple-dialog";
import { DeleteMemberDialog } from "@/components/feature/admin-mitglieder/delete-member-dialog";
import { CreateMemberDialog } from "@/components/feature/admin-mitglieder/create-member-dialog";
import { MemberEditDialog } from "@/components/feature/admin-mitglieder/member-edit-dialog";
import { revokeResignation } from "@/components/feature/admin-mitglieder/actions";
import { createInvite } from "@/components/feature/admin-mitglieder/invite-actions";
import {
  CONTRIBUTION_CATEGORY_LABELS,
  type ContributionCategory,
} from "@/lib/members/contribution";
import { MEMBERSHIP_STATE_LABELS, formatDatePlain } from "@/lib/utils/format";
import type { MembershipState } from "@/lib/members/meeples";
import type { VereinsmitgliedRow } from "@/components/feature/admin-mitglieder/vereinsmitglied-row";

export type { VereinsmitgliedRow };

type ZustandFilter = MembershipState | "alle";
type PortalLoginFilter = "alle" | "vorhanden" | "fehlt";

const ZUSTAND_FILTERS: { value: ZustandFilter; label: string }[] = [
  { value: "alle", label: "Alle" },
  { value: "unregistriert", label: MEMBERSHIP_STATE_LABELS.unregistriert },
  { value: "registriert", label: MEMBERSHIP_STATE_LABELS.registriert },
  { value: "gekuendigt", label: MEMBERSHIP_STATE_LABELS.gekuendigt },
  { value: "ausgetreten", label: MEMBERSHIP_STATE_LABELS.ausgetreten },
  { value: "anonymisiert", label: MEMBERSHIP_STATE_LABELS.anonymisiert },
];

function germanDate(value: string | null) {
  return value ? formatDatePlain(value) : "—";
}

/** Vereinsmitglieder-Akkordeon (#334, Paket 6) — Member-zentrisch, standardmäßig
 * offen (im Gegensatz zum Meeple-Akkordeon in `mitglieder-table.tsx`). */
export function VereinsmitgliederTable({
  members,
  defaultInviteDays,
  canManageMembers,
  canManageInvites,
  contributionFilter,
  onClearContributionFilter,
}: {
  members: VereinsmitgliedRow[];
  defaultInviteDays: number;
  /** = `members:manage` — gated hier zusätzlich in der UI, sonst sieht ein
   * Betrachter mit nur `invites:manage` den "Vereinsmitglied
   * erstellen"-Button, bekommt beim Klick aber nur einen Server-Fehler. */
  canManageMembers: boolean;
  /** = `invites:manage` (#365) — blendet den "Einladen"-Button aus, sonst
   * sieht ihn ein `members:manage`-only-Admin und bekommt beim Klick nur
   * einen Server-Fehler (die Server Action selbst war schon korrekt
   * gegated, nur die UI nicht). */
  canManageInvites: boolean;
  /** Von der Beitragsart-Stat-Tile gesteuert (#340) — `null` heißt "kein Filter". */
  contributionFilter?: ContributionCategory[] | null;
  onClearContributionFilter?: () => void;
}) {
  const [search, setSearch] = useState("");
  const [zustandFilter, setZustandFilter] = useState<ZustandFilter>("alle");
  const [portalLoginFilter, setPortalLoginFilter] =
    useState<PortalLoginFilter>("alle");

  const filteredMembers = useMemo(() => {
    let result = members;
    if (contributionFilter) {
      result = result.filter(
        (member) =>
          member.contributionCategory &&
          contributionFilter.includes(member.contributionCategory),
      );
    }
    if (zustandFilter !== "alle") {
      result = result.filter(
        (member) => member.membershipState === zustandFilter,
      );
    }
    if (portalLoginFilter !== "alle") {
      result = result.filter((member) =>
        portalLoginFilter === "vorhanden"
          ? member.hasPortalLogin
          : !member.hasPortalLogin,
      );
    }
    if (search) {
      const needle = search.toLowerCase();
      result = result.filter(
        (member) =>
          member.displayName.toLowerCase().includes(needle) ||
          member.email.toLowerCase().includes(needle) ||
          String(member.memberNumber).includes(needle),
      );
    }
    return result;
  }, [members, search, contributionFilter, zustandFilter, portalLoginFilter]);

  return (
    <Accordion
      id="vereinsmitglieder"
      defaultValue={["vereinsmitglieder"]}
      className="bg-card rounded-lg border"
    >
      <AccordionItem value="vereinsmitglieder" className="border-b-0">
        <AccordionTrigger className="px-5">
          <span className="flex items-center gap-2">
            <span className="font-serif text-lg font-bold">
              Vereinsmitglieder
            </span>
            <Badge>{members.length}</Badge>
          </span>
        </AccordionTrigger>
        <AccordionPanel className="px-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full max-w-sm">
                <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  placeholder="Vereinsmitglied suchen …"
                  className="pl-9"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <select
                value={zustandFilter}
                onChange={(event) =>
                  setZustandFilter(event.target.value as ZustandFilter)
                }
                aria-label="Nach Zustand filtern"
                className="border-input h-8 rounded-md border bg-transparent px-2 text-sm"
              >
                {ZUSTAND_FILTERS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                value={portalLoginFilter}
                onChange={(event) =>
                  setPortalLoginFilter(event.target.value as PortalLoginFilter)
                }
                aria-label="Nach Portal-Login filtern"
                className="border-input h-8 rounded-md border bg-transparent px-2 text-sm"
              >
                <option value="alle">Portal-Login: alle</option>
                <option value="vorhanden">Portal-Login: vorhanden</option>
                <option value="fehlt">Portal-Login: fehlt</option>
              </select>
              {contributionFilter && (
                <Badge variant="secondary" className="gap-1">
                  Beitragsart:{" "}
                  {contributionFilter
                    .map((c) => CONTRIBUTION_CATEGORY_LABELS[c])
                    .join(" / ")}
                  {onClearContributionFilter && (
                    <button
                      type="button"
                      onClick={onClearContributionFilter}
                      aria-label="Beitragsart-Filter entfernen"
                    >
                      ×
                    </button>
                  )}
                </Badge>
              )}
              {canManageMembers && (
                <div className="ml-auto">
                  <CreateMemberDialog />
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead />
                    <TableHead>Nr.</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Beitragsart</TableHead>
                    <TableHead>Zustand</TableHead>
                    <TableHead>Beigetreten</TableHead>
                    <TableHead>Kündigung / Austritt</TableHead>
                    <TableHead>Portal-Login</TableHead>
                    <TableHead className="text-right"> </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="text-muted-foreground py-6 text-center"
                      >
                        Keine Vereinsmitglieder gefunden.
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <MemberEditDialog member={member} />
                      </TableCell>
                      <TableCell className="font-mono">
                        {member.memberNumber}
                      </TableCell>
                      <TableCell
                        className={
                          member.membershipState === "anonymisiert"
                            ? "text-muted-foreground"
                            : "font-medium"
                        }
                      >
                        {member.displayName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {member.contributionCategory
                          ? CONTRIBUTION_CATEGORY_LABELS[
                              member.contributionCategory
                            ]
                          : "unbestimmt"}
                      </TableCell>
                      <TableCell>
                        <MembershipStatePill state={member.membershipState} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {germanDate(member.joinedAt)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {member.resignedAt
                          ? `${germanDate(member.resignedAt)} → ${germanDate(member.membershipEndsAt)}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {member.hasPortalLogin ? (
                          member.meepleId ? (
                            <Link
                              href="/admin/mitglieder#mitglieder"
                              className="text-primary hover:underline"
                              title="Zum Meeple-Profil im Benutzer-Akkordeon"
                            >
                              vorhanden
                            </Link>
                          ) : (
                            "vorhanden"
                          )
                        ) : (
                          canManageInvites && (
                            <ActionButton
                              size="sm"
                              variant="outline"
                              action={async () => {
                                await createInvite({
                                  memberId: member.id,
                                  days: defaultInviteDays,
                                });
                              }}
                              pendingLabel="Lade ein…"
                            >
                              <UserPlus />
                              Einladen
                            </ActionButton>
                          )
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          {member.stufe3Eligible && (
                            <DeleteMemberDialog
                              memberId={member.id}
                              displayName={member.displayName}
                            />
                          )}
                          {member.membershipState === "ausgetreten" &&
                            member.meepleId &&
                            member.openGames === 0 &&
                            member.openUnits === 0 && (
                              <AnonymiseMeepleDialog
                                meepleId={member.meepleId}
                                displayName={member.displayName}
                              />
                            )}
                          {member.meepleId &&
                            member.membershipState !== "anonymisiert" && (
                              <>
                                {member.resignedAt ? (
                                  <ActionButton
                                    variant="outline"
                                    size="sm"
                                    action={revokeResignation.bind(
                                      null,
                                      member.meepleId,
                                    )}
                                    pendingLabel="Widerrufe…"
                                  >
                                    <RotateCcw />
                                    Widerrufen
                                  </ActionButton>
                                ) : (
                                  <ResignMembershipDialog
                                    meepleId={member.meepleId}
                                    displayName={member.displayName}
                                  />
                                )}
                              </>
                            )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </AccordionPanel>
      </AccordionItem>
    </Accordion>
  );
}
