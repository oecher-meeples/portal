"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ScanLine } from "lucide-react";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeading } from "@/components/ui/page-heading";
import { StatTile } from "@/components/ui/stat-tile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PillToggle } from "@/components/ui/pill-toggle";
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
  sellFleaMarketItems,
  setFleaMarketItemStatus,
} from "@/lib/bringbuy/actions";
import { ImportFleaMarketItemsDialog } from "@/components/feature/admin-bringbuy/import-flea-market-items-dialog";
import { FleaMarketCartPanel } from "@/components/feature/admin-bringbuy/flea-market-cart-panel";

export type CashierItemStatus =
  | "PENDING"
  | "FOR_SALE"
  | "RESERVED"
  | "SOLD"
  | "PAID_OUT"
  | "RETURNED"
  | "DONATED";

export type CashierItem = {
  id: string;
  code: string;
  title: string;
  sellerName: string;
  priceEuros: number;
  status: CashierItemStatus;
  cartId: string | null;
};

export type CashierEventOption = {
  id: string;
  title: string;
};

export type ReservedCart = {
  id: string;
  name: string;
  itemIds: string[];
  totalEuros: number;
};

const TABS = [
  { label: "Kasse", value: "kasse" },
  { label: "Reservierte Warenkörbe", value: "warenkoerbe" },
] as const;

export function AdminBringBuyView({
  events,
  selectedEventId,
  stats,
  items,
  reservedCarts,
}: {
  events: CashierEventOption[];
  selectedEventId: string;
  stats: FleaMarketStats;
  items: CashierItem[];
  reservedCarts: ReservedCart[];
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]["value"]>("kasse");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  function toggleSelected(itemId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  function restoreCart(cart: ReservedCart) {
    setSelectedIds(new Set(cart.itemIds));
    setTab("kasse");
  }

  const selectedItems = items.filter((item) => selectedIds.has(item.id));

  return (
    <PageContainer>
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

      <PillToggle options={[...TABS]} value={tab} onChange={setTab} />

      {tab === "warenkoerbe" ? (
        <div className="flex flex-col gap-2">
          {reservedCarts.length === 0 && (
            <p className="text-muted-foreground text-sm">
              Aktuell keine reservierten Warenkörbe.
            </p>
          )}
          {reservedCarts.map((cart) => (
            <div
              key={cart.id}
              className="bg-card flex items-center justify-between gap-3 rounded-lg border p-4"
            >
              <div>
                <p className="font-medium">{cart.name}</p>
                <p className="text-muted-foreground text-sm">
                  {cart.itemIds.length} Artikel · {cart.totalEuros} €
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => restoreCart(cart)}
              >
                Wiederherstellen
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-8" />
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
                  <CashierItemRow
                    key={item.id}
                    item={item}
                    selected={selectedIds.has(item.id)}
                    onToggleSelected={() => toggleSelected(item.id)}
                  />
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

            <FleaMarketCartPanel
              eventId={selectedEventId}
              selectedItems={selectedItems}
              onCleared={() => setSelectedIds(new Set())}
            />
          </div>
        </div>
      )}
    </PageContainer>
  );
}

/** Owns its own action state so a pending mutation only disables its own row, not the whole table. */
function CashierItemRow({
  item,
  selected,
  onToggleSelected,
}: {
  item: CashierItem;
  selected: boolean;
  onToggleSelected: () => void;
}) {
  const action = useAction();
  const canSelect = item.status === "FOR_SALE" || item.status === "RESERVED";

  return (
    <TableRow>
      <TableCell>
        {canSelect && (
          <input
            type="checkbox"
            className="accent-primary size-4"
            checked={selected}
            onChange={onToggleSelected}
            aria-label={`${item.title} in den Warenkorb`}
          />
        )}
      </TableCell>
      <TableCell className="font-mono text-sm">{item.code}</TableCell>
      <TableCell className="font-medium">{item.title}</TableCell>
      <TableCell className="text-muted-foreground">{item.sellerName}</TableCell>
      <TableCell>{item.priceEuros} €</TableCell>
      <TableCell>
        <FleaMarketStatusPill status={item.status} />
      </TableCell>
      <TableCell className="flex flex-wrap justify-end gap-1.5 text-right">
        {item.status === "PENDING" && (
          <Button
            size="sm"
            disabled={action.pending}
            onClick={() => action.run(() => approveFleaMarketItem(item.id))}
          >
            Freigeben
          </Button>
        )}
        {(item.status === "FOR_SALE" || item.status === "RESERVED") && (
          <SellOrReturnActions itemId={item.id} action={action} />
        )}
        {item.status === "FOR_SALE" && (
          <Button
            size="sm"
            variant="ghost"
            disabled={action.pending}
            onClick={() =>
              action.run(() => setFleaMarketItemStatus(item.id, "DONATED"))
            }
          >
            Gespendet
          </Button>
        )}
        {item.status === "SOLD" && (
          <Button
            size="sm"
            variant="outline"
            disabled={action.pending}
            onClick={() =>
              action.run(() => setFleaMarketItemStatus(item.id, "PAID_OUT"))
            }
          >
            Ausgezahlt
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

/** Shared by FOR_SALE and RESERVED rows — both allow selling and returning. */
function SellOrReturnActions({
  itemId,
  action,
}: {
  itemId: string;
  action: ReturnType<typeof useAction>;
}) {
  return (
    <>
      <Button
        size="sm"
        disabled={action.pending}
        onClick={() => action.run(() => sellFleaMarketItems([itemId]))}
      >
        Verkauft
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={action.pending}
        onClick={() =>
          action.run(() => setFleaMarketItemStatus(itemId, "RETURNED"))
        }
      >
        Zurückgegeben
      </Button>
    </>
  );
}
