import { ScanLine } from "lucide-react";
import { PageHeading } from "@/components/ui/page-heading";
import { StatTile } from "@/components/ui/stat-tile";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
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
import {
  FLEA_STATUS_LABELS,
  type FleaMarketItem,
  type FleaMarketStatus,
} from "@/data/bringbuy";

const STATUS_TONE: Record<FleaMarketStatus, StatusTone> = {
  FOR_SALE: "positive",
  RESERVED: "warning",
  SOLD: "neutral",
};

type AdminBringBuyMockViewProps = {
  stats: { listed: number; soldToday: number; revenue: number; reserved: number };
  items: FleaMarketItem[];
};

export function AdminBringBuyMockView({
  stats,
  items,
}: AdminBringBuyMockViewProps) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Flohmarkt"
        title="Bring & Buy â€“ Kassenansicht"
        description="GroÃŸevent-Abwicklung mit Excel-Massenimport. Artikel scannen, reservieren, Verkauf bestÃ¤tigen."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Artikel gelistet" value={stats.listed} />
        <StatTile label="Verkauft heute" value={stats.soldToday} />
        <StatTile label="Umsatz" value={`${stats.revenue} â‚¬`} />
        <StatTile label="Reserviert" value={stats.reserved} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>#</TableHead>
                <TableHead>Artikel</TableHead>
                <TableHead>VerkÃ¤ufer</TableHead>
                <TableHead>Preis</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-sm">{item.id}</TableCell>
                  <TableCell className="font-medium">{item.title}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.seller}
                  </TableCell>
                  <TableCell>{item.price} â‚¬</TableCell>
                  <TableCell>
                    <StatusPill
                      label={FLEA_STATUS_LABELS[item.status]}
                      tone={STATUS_TONE[item.status]}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-4">
          <div className="bg-card rounded-lg border p-5">
            <h2 className="font-serif text-lg font-bold">Kasse</h2>
            <div className="relative mt-3">
              <ScanLine className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input placeholder="Artikel-QR scannen â€¦" className="pl-9" />
            </div>
            <div className="mt-3 flex gap-2">
              <Button className="flex-1">Verkauf bestÃ¤tigen</Button>
              <Button variant="outline" className="flex-1">
                Reservieren
              </Button>
            </div>
          </div>

          <div className="bg-primary/10 rounded-lg border p-5">
            <h2 className="font-serif text-lg font-bold">Excel-Massenimport</h2>
            <p className="text-muted-foreground mt-1.5 text-sm">
              Alle Artikel eines Events per Vorlage hochladen.
            </p>
            <Button variant="outline" className="mt-3">
              Datei wÃ¤hlen â€¦
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
