import { Search } from "lucide-react";
import { PageHeading } from "@/components/ui/page-heading";
import { Button } from "@/components/ui/button";
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
import { STATUS_LABELS, type BoardGame, type GameStatus } from "@/data/games";

const STATUS_TONE: Record<GameStatus, StatusTone> = {
  AVAILABLE: "positive",
  BORROWED: "warning",
  MAINTENANCE: "info",
};

const DEINVENTORIZED_EXAMPLE = {
  code: "OM-2024-0031",
  game: "Agricola (Erstaufl.)",
  note: "Verkauft 2025",
};

type AdminBestandMockViewProps = {
  games: BoardGame[];
};

export function AdminBestandMockView({ games }: AdminBestandMockViewProps) {
  const inventoryRows = games.flatMap((game) =>
    game.copies.map((copy) => ({ game: game.title, ...copy })),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Bestandsverwaltung"
        title="Bestand & Deinventarisierung"
        description="Exemplare verwalten, Standorte tauschen, QR-Etiketten generieren. Ausgemusterte Spiele werden deinventarisiert â€“ nie gelÃ¶scht."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input placeholder="Spiel oder QR-Code suchen â€¦" className="pl-9" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Inventur</Button>
          <Button>+ Spiel anlegen (BGG)</Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>QR-Etikett</TableHead>
              <TableHead>Spiel</TableHead>
              <TableHead>Standort</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right"> </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inventoryRows.map((row) => (
              <TableRow key={row.code}>
                <TableCell className="font-mono text-sm">{row.code}</TableCell>
                <TableCell className="font-medium">{row.game}</TableCell>
                <TableCell className="text-muted-foreground">
                  {row.location}
                </TableCell>
                <TableCell>
                  <StatusPill
                    label={STATUS_LABELS[row.status]}
                    tone={STATUS_TONE[row.status]}
                  />
                </TableCell>
                <TableCell className="flex justify-end gap-2 text-right">
                  <Button variant="outline" size="sm" className="gap-1">
                    Standort
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                  >
                    Deinventarisieren
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="opacity-60">
              <TableCell className="font-mono text-sm">
                {DEINVENTORIZED_EXAMPLE.code}
              </TableCell>
              <TableCell className="font-medium line-through">
                {DEINVENTORIZED_EXAMPLE.game}
              </TableCell>
              <TableCell className="text-muted-foreground">â€”</TableCell>
              <TableCell>
                <StatusPill label="Deinventarisiert" tone="neutral" />
              </TableCell>
              <TableCell className="text-muted-foreground text-right text-sm">
                {DEINVENTORIZED_EXAMPLE.note}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <p className="bg-primary/10 rounded-md p-3 text-sm">
        Deinventarisierte Exemplare bleiben mit ihren Verleih-Belegen
        (BorrowReceipt) verknÃ¼pft â€“ die Historie bleibt lÃ¼ckenlos.
      </p>
    </div>
  );
}
