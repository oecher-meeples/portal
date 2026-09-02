"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, PackageOpen, PackageCheck } from "lucide-react";
import { PageHeading } from "@/components/ui/page-heading";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatTile } from "@/components/ui/stat-tile";
import { QuickActionCard } from "@/components/ui/quick-action-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusPill } from "@/components/ui/status-pill";
import { GameZustandPill } from "@/components/entities/game-zustand-pill";
import { CreateBoardGameDialog } from "@/components/widgets/board-game/create-board-game-dialog";
import { BulkImportBoardGamesDialog } from "@/components/widgets/board-game/bulk-import-board-games-dialog";
import { EditBoardGameDialog } from "@/components/widgets/board-game/edit-board-game-dialog";
import { GameActionsMenu } from "@/components/widgets/game-holding/game-actions-menu";
import { matchesAdminBestandSearch } from "@/components/feature/admin-bestand/admin-bestand-search";
import { ScanSearchDialog } from "@/components/ui/scan-search-dialog";
import { AdminBestandCsvExportDialog } from "@/components/feature/admin-bestand/admin-bestand-csv-export-dialog";
import type { AdminBoardGameRow } from "@/lib/ludothek/admin-bestand-rows";
import { PageContainer } from "@/components/ui/page-container";

export type { AdminBoardGameRow } from "@/lib/ludothek/admin-bestand-rows";

type QuickFilter = "all" | "ungeprueft" | "mangel" | "nicht-erfasst";

export function AdminBestandView({
  games,
  showDeinventarised,
  defaultEan,
  defaultQuickFilter,
  canManageGames,
  activeLoanCount = 0,
  unconfirmedCount = 0,
}: {
  games: AdminBoardGameRow[];
  showDeinventarised: boolean;
  defaultEan?: string;
  /** Deep-link from the Admin-Dashboard-Karten (#224-Folge), z. B. `?filter=nicht-erfasst`. */
  defaultQuickFilter?: Exclude<QuickFilter, "all">;
  canManageGames: boolean;
  activeLoanCount?: number;
  /** Offene, unbestätigte Übergaben (#290) — Link zur Antrags-Queue. */
  unconfirmedCount?: number;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(
    defaultQuickFilter ?? "all",
  );

  const filtered = useMemo(() => {
    return games.filter((game) => {
      if (!matchesAdminBestandSearch(game, search)) {
        return false;
      }
      if (quickFilter === "ungeprueft" && !game.needsCompletenessCheck)
        return false;
      if (quickFilter === "mangel" && game.status !== "MAINTENANCE")
        return false;
      if (quickFilter === "nicht-erfasst" && game.zustand !== "nicht-erfasst") {
        return false;
      }
      return true;
    });
  }, [games, search, quickFilter]);

  function toggleShowDeinventarised() {
    const url = new URL(window.location.href);
    if (showDeinventarised) {
      url.searchParams.delete("deinventarisiert");
    } else {
      url.searchParams.set("deinventarisiert", "1");
    }
    router.push(`${url.pathname}${url.search}`);
  }

  return (
    <PageContainer className="gap-6">
      <PageHeading
        eyebrow="Bestandsverwaltung"
        title="Bestand & Vollständigkeitsprüfung"
        description="Ein Datensatz pro physischem Spiel. Standort und Verantwortlichkeit ergeben sich aus dem Aufenthalt, nicht aus einem Feld."
        action={
          <div className="flex flex-wrap gap-2">
            <BulkImportBoardGamesDialog />
            <CreateBoardGameDialog defaultEan={defaultEan} />
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Ausleihen"
          value={activeLoanCount}
          href="/admin/bestand/ausleihen"
        />
        <StatTile
          label="Unbestätigt"
          value={unconfirmedCount}
          href="/admin/bestand/unbestaetigt"
        />
        <QuickActionCard
          href="/admin/bestand/event-ausgabe"
          label="Event-Ausgabe"
          icon={PackageOpen}
        />
        <QuickActionCard
          href="/admin/bestand/event-rueckgabe"
          label="Event-Rückgabe"
          icon={PackageCheck}
        />
      </div>

      <div className="bg-background sticky top-24 z-10 flex flex-wrap items-center gap-3 py-2">
        <div className="relative w-full max-w-sm">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Spiel, EAN oder BGG-ID suchen …"
            className="pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <ScanSearchDialog onScanned={setSearch} />
        <div className="flex flex-wrap gap-2 text-sm">
          {(
            [
              ["all", "Alle"],
              ["ungeprueft", "Ungeprüft"],
              ["mangel", "Mangel"],
              ["nicht-erfasst", "Nicht erfasst"],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              size="sm"
              variant={quickFilter === value ? "default" : "outline"}
              onClick={() => setQuickFilter(value)}
            >
              {label}
            </Button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          {canManageGames && (
            <AdminBestandCsvExportDialog
              filteredRows={filtered.map((game) => ({
                title: game.title,
                ean: game.ean,
                status: game.status,
                zustand: game.zustand,
                locationChain: game.locationChain,
              }))}
            />
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={toggleShowDeinventarised}
          >
            {showDeinventarised
              ? "Deinventarisierte ausblenden"
              : "Deinventarisierte anzeigen"}
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Spiel</TableHead>
              <TableHead>Inv.-Nr.</TableHead>
              <TableHead>Standort-Kette</TableHead>
              <TableHead>Zustand</TableHead>
              <TableHead>Letzte Prüfung</TableHead>
              <TableHead className="text-right"> </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((game) => {
              const isDeinventarised = game.status === "DEINVENTARISED";
              return (
                <TableRow
                  key={game.id}
                  className={isDeinventarised ? "opacity-60" : undefined}
                >
                  <TableCell
                    className={
                      isDeinventarised
                        ? "font-medium line-through"
                        : "font-medium"
                    }
                  >
                    {game.title}
                    {game.needsCompletenessCheck && (
                      <StatusPill
                        label="Prüfung offen"
                        tone="warning"
                        className="ml-2"
                      />
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {game.inventoryNumber || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {game.locationChain || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <GameZustandPill zustand={game.zustand} />
                      {game.isUnconfirmed && (
                        <StatusPill label="unbestätigt" tone="warning" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {game.lastCheckedAt ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {isDeinventarised ? (
                      game.archivedReason && (
                        <span className="text-muted-foreground text-sm">
                          {game.archivedReason}
                        </span>
                      )
                    ) : (
                      <div className="flex justify-end gap-2">
                        <EditBoardGameDialog game={game} />
                        <GameActionsMenu
                          copies={[
                            {
                              id: game.id,
                              zustand: game.zustand,
                              locationChain: game.locationChain,
                              condition: game.condition,
                              ruleBookLanguages: game.ruleBookLanguages,
                              inventoryNumber: game.inventoryNumber,
                            },
                          ]}
                          boardGameId={game.boardGameId}
                          boardGameTitle={game.title}
                          canManageGames={canManageGames}
                        />
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-muted-foreground py-6 text-center"
                >
                  Keine Spiele gefunden.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </PageContainer>
  );
}
