import type { BoardGame } from "@prisma/client";
import { Search } from "lucide-react";
import { PageHeading } from "@/components/ui/page-heading";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { CreateBoardGameDialog } from "@/components/feature/admin-bestand/create-board-game-dialog";
import { DeinventoriseBoardGameDialog } from "@/components/feature/admin-bestand/deinventorise-board-game-dialog";

const STATUS_TONE: Record<BoardGame["status"], StatusTone> = {
  ACTIVE: "positive",
  MAINTENANCE: "warning",
  DEINVENTARISED: "neutral",
};

const STATUS_LABELS: Record<BoardGame["status"], string> = {
  ACTIVE: "Aktiv",
  MAINTENANCE: "Wartung",
  DEINVENTARISED: "Deinventarisiert",
};

export function AdminBestandView({ games }: { games: BoardGame[] }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Bestandsverwaltung"
        title="Bestand & Deinventarisierung"
        description="Spiele anlegen, Standorte und Zustand pflegen. Ausgemusterte Spiele werden deinventarisiert – nie gelöscht."
        action={<CreateBoardGameDialog />}
      />

      <div className="relative w-full max-w-sm">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input placeholder="Spiel suchen …" className="pl-9" />
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Spiel</TableHead>
              <TableHead>Anzahl</TableHead>
              <TableHead>Standort / Zustand</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right"> </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {games.map((game) => {
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
                  </TableCell>
                  <TableCell>{game.quantity}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {[game.location, game.condition].filter(Boolean).join(" · ") ||
                      "—"}
                  </TableCell>
                  <TableCell>
                    <StatusPill
                      label={STATUS_LABELS[game.status]}
                      tone={STATUS_TONE[game.status]}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    {isDeinventarised ? (
                      game.archivedReason && (
                        <span className="text-muted-foreground text-sm">
                          {game.archivedReason}
                        </span>
                      )
                    ) : (
                      <DeinventoriseBoardGameDialog
                        gameId={game.id}
                        gameTitle={game.title}
                      />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {games.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-muted-foreground py-6 text-center"
                >
                  Noch keine Spiele erfasst.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
