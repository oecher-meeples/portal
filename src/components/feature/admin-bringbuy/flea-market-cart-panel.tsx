"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAction } from "@/components/ui/use-action";
import {
  reserveFleaMarketCart,
  sellFleaMarketItems,
} from "@/lib/bringbuy/actions";
import type { CashierItem } from "@/components/feature/admin-bringbuy/admin-bringbuy-view";

/**
 * Aktiver, noch unentschiedener Warenkorb an der Kasse (#266) — reiner
 * Client-State (Auswahl kommt von der Tabelle in `AdminBringBuyView`), wird
 * erst bei "Reservieren" als `FleaMarketCart` persistiert.
 */
export function FleaMarketCartPanel({
  eventId,
  selectedItems,
  onCleared,
}: {
  eventId: string;
  selectedItems: CashierItem[];
  onCleared: () => void;
}) {
  const [reserveName, setReserveName] = useState("");
  const [showReserveInput, setShowReserveInput] = useState(false);
  const sellAction = useAction({ onSuccess: onCleared });
  const reserveAction = useAction({
    onSuccess: () => {
      setShowReserveInput(false);
      setReserveName("");
      onCleared();
    },
  });

  const total = selectedItems.reduce((sum, item) => sum + item.priceEuros, 0);
  const itemIds = selectedItems.map((item) => item.id);
  const pending = sellAction.pending || reserveAction.pending;

  return (
    <div className="bg-card rounded-lg border p-5">
      <h2 className="font-serif text-lg font-bold">Warenkorb</h2>
      {selectedItems.length === 0 ? (
        <p className="text-muted-foreground mt-2 text-sm">
          Artikel im Status „Verfügbar“ oder „Reserviert“ per Häkchen auswählen.
        </p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1 text-sm">
          {selectedItems.map((item) => (
            <li key={item.id} className="flex justify-between gap-2">
              <span className="truncate">{item.title}</span>
              <span className="text-muted-foreground shrink-0">
                {item.priceEuros} €
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 flex justify-between font-medium">
        <span>Summe</span>
        <span>{total} €</span>
      </p>

      {showReserveInput && (
        <div className="mt-3 flex gap-2">
          <Input
            placeholder="Name für den Warenkorb"
            value={reserveName}
            onChange={(event) => setReserveName(event.target.value)}
          />
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <Button
          className="flex-1"
          disabled={itemIds.length === 0 || pending}
          onClick={() => sellAction.run(() => sellFleaMarketItems(itemIds))}
        >
          Verkauft
        </Button>
        <Button
          className="flex-1"
          variant="outline"
          disabled={itemIds.length === 0 || pending}
          onClick={() => {
            if (!showReserveInput) {
              setShowReserveInput(true);
              return;
            }
            void reserveAction.run(() =>
              reserveFleaMarketCart(eventId, itemIds, reserveName),
            );
          }}
        >
          Reservieren
        </Button>
      </div>
      {(sellAction.error || reserveAction.error) && (
        <p className="text-destructive mt-2 text-xs">
          {sellAction.error ?? reserveAction.error}
        </p>
      )}
    </div>
  );
}
