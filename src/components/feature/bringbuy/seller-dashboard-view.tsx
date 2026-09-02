"use client";

import { useState } from "react";
import { PageHeading } from "@/components/ui/page-heading";
import { TextField } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useAction, type ActionResult } from "@/components/ui/use-action";
import { FLEA_MARKET_ITEM_STATUS_LABELS } from "@/lib/utils/format";
import type { OwnFleaMarketItemInput } from "@/lib/bringbuy/own-items";
import { PageContainer } from "@/components/ui/page-container";

export type OwnFleaMarketItemRow = {
  id: string;
  code: string;
  title: string;
  language: string | null;
  priceEuros: number;
  status: string;
};

/**
 * Verkäufer-Dashboard (#266) — identisch für Meeple (eigene Anmeldung) und
 * externe, token-identifizierte Verkäufer:innen; welcher Fall vorliegt,
 * entscheidet die aufrufende Seite über die serverseitig gebundenen Actions.
 */
export function SellerDashboardView({
  eventTitle,
  sellerLabel,
  items,
  createItem,
  updateItem,
}: {
  eventTitle: string;
  sellerLabel: string;
  items: OwnFleaMarketItemRow[];
  createItem: (input: OwnFleaMarketItemInput) => Promise<ActionResult>;
  updateItem: (
    itemId: string,
    input: OwnFleaMarketItemInput,
  ) => Promise<ActionResult>;
}) {
  return (
    <PageContainer className="gap-6">
      <PageHeading
        eyebrow="Bring & Buy"
        title={eventTitle}
        description={`Angemeldet als ${sellerLabel} — neue Artikel anmelden und noch nicht freigegebene bearbeiten.`}
      />

      <NewItemForm createItem={createItem} />

      <div className="flex flex-col gap-2">
        {items.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Noch keine Artikel angemeldet.
          </p>
        )}
        {items.map((item) => (
          <ItemRow key={item.id} item={item} updateItem={updateItem} />
        ))}
      </div>
    </PageContainer>
  );
}

function NewItemForm({
  createItem,
}: {
  createItem: (input: OwnFleaMarketItemInput) => Promise<ActionResult>;
}) {
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("");
  const [priceEuros, setPriceEuros] = useState("");
  const { run, pending, error } = useAction({
    onSuccess: () => {
      setTitle("");
      setLanguage("");
      setPriceEuros("");
    },
  });

  return (
    <div className="bg-card flex flex-col gap-3 rounded-lg border p-5">
      <h2 className="font-serif text-lg font-bold">Artikel anmelden</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <TextField
          id="new-item-title"
          label="Titel"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <TextField
          id="new-item-language"
          label="Sprache"
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
        />
        <TextField
          id="new-item-price"
          label="Preis (€)"
          type="number"
          min={0}
          step={1}
          value={priceEuros}
          onChange={(event) => setPriceEuros(event.target.value)}
        />
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button
        className="w-fit"
        disabled={pending || !title.trim() || !language.trim() || !priceEuros}
        onClick={() =>
          run(() =>
            createItem({ title, language, priceEuros: Number(priceEuros) }),
          )
        }
      >
        {pending ? "Speichere…" : "Anmelden"}
      </Button>
    </div>
  );
}

function ItemRow({
  item,
  updateItem,
}: {
  item: OwnFleaMarketItemRow;
  updateItem: (
    itemId: string,
    input: OwnFleaMarketItemInput,
  ) => Promise<ActionResult>;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [language, setLanguage] = useState(item.language ?? "");
  const [priceEuros, setPriceEuros] = useState(String(item.priceEuros));
  const { run, pending, error } = useAction({
    onSuccess: () => setEditing(false),
  });
  const canEdit = item.status === "PENDING";

  if (!editing) {
    return (
      <div className="bg-card flex items-center justify-between gap-3 rounded-lg border p-4">
        <div>
          <p className="font-medium">
            {item.title}{" "}
            <span className="text-muted-foreground font-normal">
              ({item.language ?? "—"})
            </span>
          </p>
          <p className="text-muted-foreground text-sm">
            {item.code} · {item.priceEuros} € ·{" "}
            {FLEA_MARKET_ITEM_STATUS_LABELS[
              item.status as keyof typeof FLEA_MARKET_ITEM_STATUS_LABELS
            ] ?? item.status}
          </p>
        </div>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            Bearbeiten
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-card flex flex-col gap-3 rounded-lg border p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <TextField
          id={`edit-title-${item.id}`}
          label="Titel"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <TextField
          id={`edit-language-${item.id}`}
          label="Sprache"
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
        />
        <TextField
          id={`edit-price-${item.id}`}
          label="Preis (€)"
          type="number"
          min={0}
          step={1}
          value={priceEuros}
          onChange={(event) => setPriceEuros(event.target.value)}
        />
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            run(() =>
              updateItem(item.id, {
                title,
                language,
                priceEuros: Number(priceEuros),
              }),
            )
          }
        >
          {pending ? "Speichere…" : "Speichern"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
          Abbrechen
        </Button>
      </div>
    </div>
  );
}
