"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ScanLine } from "lucide-react";
import { PageHeading } from "@/components/ui/page-heading";
import { StatTile } from "@/components/ui/stat-tile";
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
import { FleaMarketStatusPill } from "@/components/entities/flea-market-status-pill";
import { useAction } from "@/components/ui/use-action";
import type { FleaMarketStats } from "@/lib/bringbuy/stats";
import {
  approveFleaMarketItem,
  findFleaMarketItemByCode,
  setFleaMarketItemStatus,
} from "@/components/feature/admin-bringbuy/cashier-actions";
import { ImportFleaMarketItemsDialog } from "@/components/feature/admin-bringbuy/import-flea-market-items-dialog";

export type CashierItem = {
  id: string;
  code: string;
  title: string;
  sellerName: string;
  priceEuros: number;
  status: "PENDING" | "FOR_SALE" | "RESERVED" | "SOLD";
};

export type CashierEventOption = {
  id: string;
  title: string;
};

export function AdminBringBuyView({
  events,
  selectedEventId,
  stats,
  items,
}: {
  events: CashierEventOption[];
  selectedEventId: string;
  stats: FleaMarketStats;
  items: CashierItem[];
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  function selectEvent(eventId: string) {
    router.push(`/admin/bringbuy?event=${eventId}`);
  }

  async function handleCodeSearch() {
    setMessage(null);
    const result = await findFleaMarketItemByCode(selectedEventId, code);
    if (!result.success) {
      setMessage(result.error);
      return;
    }
    setMessage(`Gefunden: ${result.item.title} (${result.item.code})`);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Flohmarkt"
        title="Bring & Buy – Kassenansicht"
        description="Artikel freigeben, Status wechseln und per Code suchen — Zugriff über events:manage oder eine aktive Kasse-Schicht."
        action={<ImportFleaMarketItemsDialog events={events} />}
      />

      {events.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {events.map((event) => (
            <Button
              key={event.id}
              size="sm"
              variant={event.id === selectedEventId ? "default" : "outline"}
              onClick={() => selectEvent(event.id)}
            >
              {event.title}
            </Button>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Artikel gelistet" value={stats.listed} />
        <StatTile label="Verkauft heute" value={stats.soldToday} />
        <StatTile label="Umsatz" value={`${stats.revenue} €`} />
        <StatTile label="Reserviert" value={stats.reserved} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Code</TableHead>
                <TableHead>Artikel</TableHead>
                <TableHead>Verkäufer</TableHead>
                <TableHead>Preis</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <CashierItemRow key={item.id} item={item} />
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-4">
          <div className="bg-card rounded-lg border p-5">
            <h2 className="font-serif text-lg font-bold">Kasse</h2>
            <div className="relative mt-3">
              <ScanLine className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                placeholder="Artikel-Code eingeben (z. B. FM-0001)"
                className="pl-9"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </div>
            <Button className="mt-3 w-full" onClick={handleCodeSearch}>
              Suchen
            </Button>
            {message && (
              <p className="text-muted-foreground mt-2 text-sm">{message}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Owns its own action state so a pending mutation only disables its own row, not the whole table. */
function CashierItemRow({ item }: { item: CashierItem }) {
  const action = useAction();

  return (
    <TableRow>
      <TableCell className="font-mono text-sm">{item.code}</TableCell>
      <TableCell className="font-medium">{item.title}</TableCell>
      <TableCell className="text-muted-foreground">{item.sellerName}</TableCell>
      <TableCell>{item.priceEuros} €</TableCell>
      <TableCell>
        <FleaMarketStatusPill status={item.status} />
      </TableCell>
      <TableCell className="flex justify-end gap-1.5 text-right">
        {item.status === "PENDING" && (
          <Button
            size="sm"
            disabled={action.pending}
            onClick={() => action.run(() => approveFleaMarketItem(item.id))}
          >
            Freigeben
          </Button>
        )}
        {item.status === "FOR_SALE" && (
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={action.pending}
              onClick={() =>
                action.run(() => setFleaMarketItemStatus(item.id, "RESERVED"))
              }
            >
              Reservieren
            </Button>
            <Button
              size="sm"
              disabled={action.pending}
              onClick={() =>
                action.run(() => setFleaMarketItemStatus(item.id, "SOLD"))
              }
            >
              Verkauft
            </Button>
          </>
        )}
        {item.status === "RESERVED" && (
          <Button
            size="sm"
            disabled={action.pending}
            onClick={() =>
              action.run(() => setFleaMarketItemStatus(item.id, "SOLD"))
            }
          >
            Verkauft
          </Button>
        )}
        {action.error && (
          <p className="text-destructive basis-full text-right text-xs">
            {action.error}
          </p>
        )}
      </TableCell>
    </TableRow>
  );
}
