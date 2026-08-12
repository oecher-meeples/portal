"use client";

import { useMemo, useState } from "react";
import { RotateCcw, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { revokeResignation } from "@/components/feature/admin-mitglieder/actions";
import { formatDatePlain } from "@/lib/utils/format";
import type { MembershipState } from "@/lib/members/meeples";

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

type MeepleQuickFilter = MembershipState | "alle";

const MEEPLE_QUICK_FILTERS: { value: MeepleQuickFilter; label: string }[] = [
  { value: "aktiv", label: "Aktiv" },
  { value: "gekuendigt", label: "Gekündigt" },
  { value: "ausgetreten", label: "Ausgetreten" },
  { value: "anonymisiert", label: "Anonymisiert" },
  { value: "alle", label: "Alle" },
];

function germanDate(value: string | null) {
  return value ? formatDatePlain(value) : "—";
}

export function MitgliederTable({ meeples }: { meeples: MeepleRow[] }) {
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState<MeepleQuickFilter>("aktiv");

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
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Mitglied suchen …"
            className="pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
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
      </div>

      <div className="bg-card overflow-hidden rounded-lg border">
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
            {filteredMeeples.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-muted-foreground py-6 text-center"
                >
                  Keine Mitglieder gefunden.
                </TableCell>
              </TableRow>
            )}
            {filteredMeeples.map((meeple) => (
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
    </div>
  );
}
