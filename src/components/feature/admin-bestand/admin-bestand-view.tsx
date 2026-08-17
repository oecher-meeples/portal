"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { PageHeading } from "@/components/ui/page-heading";
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
import { StatusPill } from "@/components/ui/status-pill";
import { GameZustandPill } from "@/components/entities/game-zustand-pill";
import { CreateBoardGameDialog } from "@/components/widgets/board-game/create-board-game-dialog";
import { DeinventoriseBoardGameDialog } from "@/components/widgets/board-game/deinventorise-board-game-dialog";
import { EditBoardGameDialog } from "@/components/widgets/board-game/edit-board-game-dialog";
import { AddGameCopyDialog } from "@/components/widgets/board-game/add-game-copy-dialog";
import { requestCompletenessCheck } from "@/lib/ludothek/game-copies";
import type { GameZustand } from "@/lib/ludothek/holdings";
import { matchesAdminBestandSearch } from "@/components/feature/admin-bestand/admin-bestand-search";
import { ScanSearchDialog } from "@/components/ui/scan-search-dialog";
import type { BoardGameKind } from "@prisma/client";

export type AdminBoardGameRow = {
  /** GameCopy id. */
  id: string;
  /** BoardGame (title) id. */
  boardGameId: string;
  title: string;
  ean: string | null;
  status: "ACTIVE" | "MAINTENANCE" | "DEINVENTARISED";
  needsCompletenessCheck: boolean;
  lastCheckedAt: string | null;
  archivedReason: string | null;
  zustand: GameZustand;
  locationChain: string;
  bggId: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  playTimeMinutes: number | null;
  weight: number | null;
  imageUrl: string | null;
  description: string | null;
  mechanics: string[];
  condition: string | null;
  kind: BoardGameKind;
  explainerVideoUrl: string | null;
  /** BGG-Alternativnamen, ungefiltert — matcht in der Suche wie der Titel
   * selbst (#187). */
  alternateNames: string[];
};

type QuickFilter = "all" | "ungeprueft" | "mangel" | "nicht-erfasst";

export function AdminBestandView({
  games,
  showDeinventarised,
  defaultEan,
}: {
  games: AdminBoardGameRow[];
  showDeinventarised: boolean;
  defaultEan?: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

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

  async function handleRequestCheck(id: string) {
    setBusyId(id);
    await requestCompletenessCheck(id);
    setBusyId(null);
    router.refresh();
  }

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
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Bestandsverwaltung"
        title="Bestand & Vollständigkeitsprüfung"
        description="Ein Datensatz pro physischem Spiel. Standort und Verantwortlichkeit ergeben sich aus dem Aufenthalt, nicht aus einem Feld."
        action={<CreateBoardGameDialog defaultEan={defaultEan} />}
      />

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
        <Button
          size="sm"
          variant="outline"
          className="ml-auto"
          onClick={toggleShowDeinventarised}
        >
          {showDeinventarised
            ? "Deinventarisierte ausblenden"
            : "Deinventarisierte anzeigen"}
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Spiel</TableHead>
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
                    {game.locationChain || "—"}
                  </TableCell>
                  <TableCell>
                    <GameZustandPill zustand={game.zustand} />
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
                        {!game.needsCompletenessCheck && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busyId === game.id}
                            onClick={() => handleRequestCheck(game.id)}
                          >
                            Prüfung anfordern
                          </Button>
                        )}
                        <EditBoardGameDialog game={game} />
                        <AddGameCopyDialog
                          boardGameId={game.boardGameId}
                          boardGameTitle={game.title}
                        />
                        <DeinventoriseBoardGameDialog
                          gameId={game.id}
                          gameTitle={game.title}
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
                  colSpan={5}
                  className="text-muted-foreground py-6 text-center"
                >
                  Keine Spiele gefunden.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
