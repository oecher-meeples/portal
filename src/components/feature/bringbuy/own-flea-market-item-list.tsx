"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FleaMarketItemStatus } from "@prisma/client";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FLEA_MARKET_ITEM_STATUS_LABELS,
  FLEA_MARKET_ITEM_STATUS_TONES,
} from "@/lib/format";
import {
  deleteOwnFleaMarketItem,
  updateOwnFleaMarketItem,
} from "@/components/feature/bringbuy/actions";

export type OwnFleaMarketItem = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  priceEuros: number;
  status: FleaMarketItemStatus;
  eventTitle: string;
};

const EDITABLE_STATUSES: FleaMarketItemStatus[] = ["PENDING", "FOR_SALE"];

function ItemRow({ item }: { item: OwnFleaMarketItem }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    title: item.title,
    priceEuros: item.priceEuros,
    description: item.description ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canEdit = EDITABLE_STATUSES.includes(item.status);

  async function handleSave() {
    setError(null);
    setIsSubmitting(true);
    const result = await updateOwnFleaMarketItem(item.id, {
      title: form.title,
      priceEuros: Number(form.priceEuros),
      description: form.description || undefined,
    });
    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    setIsEditing(false);
    router.refresh();
  }

  async function handleDelete() {
    setIsSubmitting(true);
    const result = await deleteOwnFleaMarketItem(item.id);
    setIsSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  if (isEditing) {
    return (
      <div className="bg-card flex flex-col gap-2 rounded-lg border p-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`edit-title-${item.id}`}>Titel</Label>
          <Input
            id={`edit-title-${item.id}`}
            value={form.title}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, title: event.target.value }))
            }
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`edit-price-${item.id}`}>Preis (€)</Label>
          <Input
            id={`edit-price-${item.id}`}
            type="number"
            min={0}
            value={form.priceEuros}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                priceEuros: Number(event.target.value),
              }))
            }
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`edit-description-${item.id}`}>Beschreibung</Label>
          <Textarea
            id={`edit-description-${item.id}`}
            rows={2}
            value={form.description}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, description: event.target.value }))
            }
          />
        </div>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={isSubmitting || !form.title.trim()}
            onClick={handleSave}
          >
            {isSubmitting ? "Speichere…" : "Speichern"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => setIsEditing(false)}
          >
            Abbrechen
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card flex flex-col gap-2 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-serif font-semibold">{item.title}</p>
          <p className="text-muted-foreground text-xs">
            {item.code} · {item.eventTitle}
          </p>
        </div>
        <StatusPill
          label={FLEA_MARKET_ITEM_STATUS_LABELS[item.status]}
          tone={FLEA_MARKET_ITEM_STATUS_TONES[item.status]}
        />
      </div>
      {item.description && (
        <p className="text-sm">{item.description}</p>
      )}
      <div className="flex items-center justify-between gap-3">
        <span className="text-primary font-serif font-bold">
          {item.priceEuros} €
        </span>
        {canEdit && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
              Bearbeiten
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isSubmitting}
              onClick={handleDelete}
            >
              Löschen
            </Button>
          </div>
        )}
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}

export function OwnFleaMarketItemList({
  items,
}: {
  items: OwnFleaMarketItem[];
}) {
  if (items.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Du hast noch keine Flohmarkt-Artikel angelegt.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <ItemRow key={item.id} item={item} />
      ))}
    </div>
  );
}
