"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
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
import { ResignMembershipDialog } from "@/components/feature/admin-mitglieder/resign-membership-dialog";
import { revokeResignation } from "@/components/feature/admin-mitglieder/actions";
import {
  isActive as isActiveRoleAssignment,
  type RoleOption,
} from "@/components/feature/admin-mitglieder/meeple-role-select";
import { MeepleEditDialog } from "@/components/feature/admin-mitglieder/meeple-edit-dialog";
import { SystemkontoDialog } from "@/components/feature/admin-mitglieder/systemkonto-dialog";
import { formatDatePlain } from "@/lib/utils/format";
import type { MembershipState } from "@/lib/members/meeples";
import type { MeepleRow } from "@/components/feature/admin-mitglieder/meeple-row";

export type { MeepleRow };

type MeepleQuickFilter = MembershipState | "alle";

// Meeple-Tabelle listet nur bestehende Konten — "unregistriert" (kein
// Konto) kann hier nie vorkommen, deshalb kein eigener Filter dafür (#361).
const MEEPLE_QUICK_FILTERS: { value: MeepleQuickFilter; label: string }[] = [
  { value: "alle", label: "Alle" },
  { value: "registriert", label: "Aktiv" },
  { value: "gekuendigt", label: "Gekündigt" },
  { value: "ausgetreten", label: "Ausgetreten" },
  { value: "anonymisiert", label: "Anonymisiert" },
];

function germanDate(value: string | null) {
  return value ? formatDatePlain(value) : "—";
}

/** Voller Vereinsmitglied-Name mit dem frei wählbaren Meeple-`displayName`
 * dahinter in Klammern — nur wenn beide vorhanden UND unterschiedlich sind,
 * sonst genügt der eine Name (kein "X (X)"). */
function memberColumnLabel(meeple: Pick<MeepleRow, "displayName" | "memberFullName">) {
  if (meeple.memberFullName && meeple.memberFullName !== meeple.displayName) {
    return `${meeple.memberFullName} (${meeple.displayName})`;
  }
  return meeple.displayName;
}

export function MitgliederTable({
  meeples,
  roles,
  canReadBankData,
  canManageAdminAccess,
  canCreateSystemkonto,
}: {
  meeples: MeepleRow[];
  roles: RoleOption[];
  canReadBankData: boolean;
  canManageAdminAccess: boolean;
  canCreateSystemkonto: boolean;
}) {
  // Deep-Link von der Vereinsmitglieder-Tabelle ("vorhanden" bei
  // `hasPortalLogin`, siehe `vereinsmitglieder-table.tsx`) — öffnet dieses
  // Akkordeon automatisch (das Hash `#mitglieder` allein scrollt nur dorthin,
  // öffnet aber kein per Base-UI kollabiertes Panel) und filtert direkt auf
  // die verlinkte Person, statt sie erst manuell suchen zu müssen.
  const searchParams = useSearchParams();
  const focusMeepleId = searchParams.get("meepleId");
  const focusMeeple = meeples.find((meeple) => meeple.id === focusMeepleId);

  const [search, setSearch] = useState(focusMeeple?.displayName ?? "");
  const [quickFilter, setQuickFilter] = useState<MeepleQuickFilter>(
    focusMeeple ? "alle" : "registriert",
  );
  // Kontrollierter statt unkontrollierter Accordion-State (statt
  // `defaultValue`): `focusMeepleId` kommt aus `useSearchParams()` und kann
  // sich per Client-Navigation ändern, ohne dass diese Komponente neu
  // gemountet wird (z. B. erneuter Klick auf den Deep-Link, während die
  // Seite schon offen ist). Ein `defaultValue`, das sich nach dem ersten
  // Render ändert, ist bei Base UI ein Fehler ("changing the default value
  // of an uncontrolled Accordion").
  const [openItems, setOpenItems] = useState<string[]>(
    focusMeepleId ? ["mitglieder"] : [],
  );

  // Zustand während des Renders anpassen (kein `useEffect`, siehe
  // `use-controlled-combobox-input.ts`): bei einem neuen `focusMeepleId`
  // Suche/Filter/Akkordeon erneut auf die verlinkte Person setzen —
  // andernfalls blieben `search`/`quickFilter`/`openItems` (alle nur einmal
  // per `useState(initialValue)` gesetzt) beim allerersten Wert stehen, wenn
  // sich `focusMeepleId` ohne vollen Remount ändert. Überschreibt kein
  // manuelles Suchen/Filtern/Auf-Zuklappen danach.
  const [trackedFocusMeepleId, setTrackedFocusMeepleId] =
    useState(focusMeepleId);
  if (focusMeepleId !== trackedFocusMeepleId) {
    setTrackedFocusMeepleId(focusMeepleId);
    if (focusMeepleId) {
      setOpenItems(["mitglieder"]);
      setSearch(focusMeeple?.displayName ?? "");
      setQuickFilter("alle");
    }
  }

  const now = new Date();

  const searchedMeeples = useMemo(() => {
    if (!search) return meeples;
    return meeples.filter((meeple) =>
      meeple.displayName.toLowerCase().includes(search.toLowerCase()),
    );
  }, [meeples, search]);

  const filteredMeeples = useMemo(() => {
    if (quickFilter === "alle") return searchedMeeples;
    return searchedMeeples.filter(
      (meeple) => meeple.membershipState === quickFilter,
    );
  }, [searchedMeeples, quickFilter]);

  return (
    <Accordion
      id="mitglieder"
      className="bg-card rounded-lg border"
      value={openItems}
      onValueChange={setOpenItems}
    >
      <AccordionItem value="mitglieder" className="border-b-0">
        <AccordionTrigger className="px-5">
          <span className="flex items-center gap-2">
            <span className="font-serif text-lg font-bold">Benutzer</span>
            <Badge>{meeples.length}</Badge>
          </span>
        </AccordionTrigger>
        <AccordionPanel className="px-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <SearchInput
                placeholder="Benutzerkonto suchen …"
                value={search}
                onChange={setSearch}
                className="w-full max-w-sm"
              />
              <div className="flex flex-wrap gap-2 text-sm">
                {MEEPLE_QUICK_FILTERS.map(({ value, label }) => (
                  <Button
                    key={value}
                    size="sm"
                    variant={quickFilter === value ? "default" : "outline"}
                    disabled={
                      value !== "alle" &&
                      !searchedMeeples.some(
                        (meeple) => meeple.membershipState === value,
                      )
                    }
                    onClick={() => setQuickFilter(value)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              {canCreateSystemkonto && (
                <div className="ml-auto">
                  <SystemkontoDialog />
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead />
                    <TableHead>Vereinsmitglied</TableHead>
                    <TableHead>Rollen</TableHead>
                    <TableHead>Beigetreten</TableHead>
                    <TableHead>Kündigung / Austritt</TableHead>
                    <TableHead className="text-right"> </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMeeples.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-muted-foreground py-6 text-center"
                      >
                        Keine Vereinsmitglieder gefunden.
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredMeeples.map((meeple) => (
                    <TableRow key={meeple.id}>
                      <TableCell>
                        <MeepleEditDialog
                          meeple={meeple}
                          roles={roles}
                          canReadBankData={canReadBankData}
                          canManageAdminAccess={canManageAdminAccess}
                        />
                      </TableCell>
                      <TableCell
                        className={
                          meeple.membershipState === "anonymisiert"
                            ? "text-muted-foreground"
                            : "font-medium"
                        }
                      >
                        {meeple.memberId ? (
                          <Link
                            href={`/admin/mitglieder?memberId=${meeple.memberId}#vereinsmitglieder`}
                            className="hover:underline"
                            title="Mitglied im Vereinsmitglieder-Akkordeon suchen"
                          >
                            {memberColumnLabel(meeple)}
                          </Link>
                        ) : (
                          memberColumnLabel(meeple)
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {meeple.hasAccount ? (
                          <div className="flex flex-wrap gap-1">
                            {meeple.roleAssignments.filter((a) =>
                              isActiveRoleAssignment(a, now),
                            ).length === 0 ? (
                              <span>— keine Rolle —</span>
                            ) : (
                              meeple.roleAssignments
                                .filter((a) => isActiveRoleAssignment(a, now))
                                .map((a) => (
                                  <Badge key={a.id} variant="outline">
                                    {a.roleName}
                                  </Badge>
                                ))
                            )}
                          </div>
                        ) : (
                          "Kein Konto"
                        )}
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
          </div>
        </AccordionPanel>
      </AccordionItem>
    </Accordion>
  );
}
