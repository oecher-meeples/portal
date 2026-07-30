"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { Field, TextAreaField, TextField } from "@/components/ui/field";
import { createFleaMarketItem } from "@/components/feature/bringbuy/actions";

export type FleaMarketEventOption = {
  id: string;
  title: string;
  dateLabel: string;
};

const EMPTY_FORM = {
  eventId: "",
  title: "",
  priceEuros: 0,
  description: "",
};

export function CreateFleaMarketItemDialog({
  events,
}: {
  events: FleaMarketEventOption[];
}) {
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    eventId: events[0]?.id ?? "",
  });

  function patch<K extends keyof typeof EMPTY_FORM>(
    key: K,
    value: (typeof EMPTY_FORM)[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  if (events.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Aktuell ist kein Event für den Flohmarkt geplant.
      </p>
    );
  }

  return (
    <ActionDialog
      trigger={
        <Button className="gap-1.5">
          <Plus className="size-4" />
          Artikel anlegen
        </Button>
      }
      title="Neuer Flohmarkt-Artikel"
      description="Der Artikel wartet nach dem Anlegen auf Freigabe an der Flohmarkt-Kasse, bevor er im Gäste-Bereich sichtbar wird."
      submitLabel="Artikel anlegen"
      canSubmit={Boolean(form.title.trim()) && Boolean(form.eventId)}
      action={() =>
        createFleaMarketItem(
          form.eventId,
          form.title,
          Number(form.priceEuros),
          form.description || undefined,
        )
      }
      onReset={() => setForm({ ...EMPTY_FORM, eventId: events[0]?.id ?? "" })}
    >
      <div className="flex flex-col gap-3">
        <Field label="Event" htmlFor="flea-event">
          <select
            id="flea-event"
            value={form.eventId}
            onChange={(event) => patch("eventId", event.target.value)}
            className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
          >
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title} · {event.dateLabel}
              </option>
            ))}
          </select>
        </Field>
        <TextField
          id="flea-title"
          label="Titel"
          value={form.title}
          onChange={(event) => patch("title", event.target.value)}
          placeholder="z. B. Wingspan"
          required
        />
        <TextField
          id="flea-price"
          label="Preis (€)"
          type="number"
          min={0}
          value={form.priceEuros}
          onChange={(event) => patch("priceEuros", Number(event.target.value))}
        />
        <TextAreaField
          id="flea-description"
          label="Beschreibung (optional)"
          rows={3}
          value={form.description}
          onChange={(event) => patch("description", event.target.value)}
          placeholder="Zustand, Vollständigkeit, Besonderheiten"
        />
      </div>
    </ActionDialog>
  );
}
