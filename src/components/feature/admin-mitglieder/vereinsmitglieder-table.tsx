"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { RotateCcw, UserPlus } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
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
  CONTRIBUTION_CATEGORY_SHORT_LABELS,
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
  canManageMembers,
  canManageInvites,
  isAdmin = false,
  contributionFilter,
  onClearContributionFilter,
}: {
  members: VereinsmitgliedRow[];
  /** = `members:manage` — gated hier zusätzlich in der UI, sonst sieht ein
   * Betrachter mit nur `invites:manage` den "Vereinsmitglied
   * erstellen"-Button, bekommt beim Klick aber nur einen Server-Fehler. */
  canManageMembers: boolean;
  /** = `invites:manage` (#365) — blendet den "Einladen"-Button aus, sonst
   * sieht ihn ein `members:manage`-only-Admin und bekommt beim Klick nur
   * einen Server-Fehler (die Server Action selbst war schon korrekt
   * gegated, nur die UI nicht). */
  canManageInvites: boolean;
  /** = `admin:access` — schaltet zusammen mit `NODE_ENV === "development"`
   * den Demo-Adresse-Button in `MemberPersonendatenFields` frei. */
  isAdmin?: boolean;
  /** Von der Beitragsart-Stat-Tile gesteuert (#340) — `null` heißt "kein Filter". */
  contributionFilter?: ContributionCategory[] | null;
  onClearContributionFilter?: () => void;
}) {
  // Deep-Link von der Benutzer-Tabelle ("Mitglied"-Name-Link, siehe
  // `mitglieder-table.tsx`) — filtert direkt auf das verlinkte
  // Vereinsmitglied, vice versa zum `?meepleId=…#mitglieder`-Link dort. Das
  // Akkordeon selbst ist bereits standardmäßig offen, muss hier also nicht
  // wie im Gegenstück extra gesteuert werden.
  const searchParams = useSearchParams();
  const focusMemberId = searchParams.get("memberId");
  const focusMember = members.find((member) => member.id === focusMemberId);

  const [search, setSearch] = useState(focusMember?.displayName ?? "");
  const [zustandFilter, setZustandFilter] = useState<ZustandFilter>("alle");
  const [portalLoginFilter, setPortalLoginFilter] =
    useState<PortalLoginFilter>("alle");

  // Zustand während des Renders anpassen (kein `useEffect`, siehe
  // `use-controlled-combobox-input.ts`/`mitglieder-table.tsx`): bei einem
  // neuen `focusMemberId` die Suche erneut auf das verlinkte Mitglied setzen
  // — sonst bliebe `search` (nur einmal per `useState(initialValue)`
  // gesetzt) beim allerersten Wert stehen, wenn sich `focusMemberId` ohne
  // vollen Remount ändert (z. B. erneuter Klick auf den Deep-Link).
  const [trackedFocusMemberId, setTrackedFocusMemberId] =
    useState(focusMemberId);
  if (focusMemberId !== trackedFocusMemberId) {
    setTrackedFocusMemberId(focusMemberId);
    if (focusMemberId) {
      setSearch(focusMember?.displayName ?? "");
      setZustandFilter("alle");
      setPortalLoginFilter("alle");
    }
  }

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
          (member.email?.toLowerCase().includes(needle) ?? false) ||
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
              <SearchInput
                placeholder="Vereinsmitglied suchen …"
                value={search}
                onChange={setSearch}
                className="w-full max-w-sm"
              />
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
                  <CreateMemberDialog isAdmin={isAdmin} />
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
                        <MemberEditDialog member={member} isAdmin={isAdmin} />
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
                          ? CONTRIBUTION_CATEGORY_SHORT_LABELS[
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
                              href={`/admin/mitglieder?meepleId=${member.meepleId}#mitglieder`}
                              className="text-primary hover:underline"
                              title="Zum Meeple-Profil im Benutzer-Akkordeon"
                            >
                              vorhanden
                            </Link>
                          ) : (
                            "vorhanden"
                          )
                        ) : member.openInviteToken ? (
                          <Link
                            href="/admin/mitglieder#einladungen"
                            className="text-primary hover:underline"
                            title="Zur Einladungsverwaltung"
                          >
                            Eingeladen
                          </Link>
                        ) : canManageInvites && !member.email ? (
                          <span
                            className="text-muted-foreground"
                            title="Ohne hinterlegte E-Mail-Adresse kann kein Einladungslink verschickt werden."
                          >
                            keine E-Mail-Adresse
                          </span>
                        ) : (
                          canManageInvites && (
                            <ActionButton
                              size="sm"
                              variant="outline"
                              action={async () => {
                                await createInvite({ memberId: member.id });
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
