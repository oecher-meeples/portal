"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { TextAreaField, TextField } from "@/components/ui/field";
import { createLfgPost } from "@/components/feature/lfg/actions";

const EMPTY_FORM = {
  gameTitle: "",
  title: "",
  plannedAt: "",
  maxParticipants: 4,
  description: "",
};

export function CreateLfgDialog() {
  const [form, setForm] = useState(EMPTY_FORM);

  function patch<K extends keyof typeof EMPTY_FORM>(
    key: K,
    value: (typeof EMPTY_FORM)[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <ActionDialog
      trigger={
        <Button className="gap-1.5">
          <Plus className="size-4" />
          Gesuch erstellen
        </Button>
      }
      title="Neues Spielergesuch"
      description="Finde Mitspielende für ein bestimmtes Spiel oder spontan für einen Abend."
      submitLabel="Gesuch veröffentlichen"
      canSubmit={Boolean(form.title.trim()) && Boolean(form.description.trim())}
      action={() =>
        createLfgPost({
          title: form.title,
          gameTitle: form.gameTitle || undefined,
          description: form.description,
          plannedAt: form.plannedAt ? new Date(form.plannedAt) : undefined,
          maxParticipants: Number(form.maxParticipants),
        })
      }
      onReset={() => setForm(EMPTY_FORM)}
    >
      <div className="flex flex-col gap-3">
        <TextField
          id="lfg-game"
          label="Spiel (Freitext, optional)"
          value={form.gameTitle}
          onChange={(event) => patch("gameTitle", event.target.value)}
          placeholder="z. B. Arche Nova"
        />
        <TextField
          id="lfg-title"
          label="Titel"
          value={form.title}
          onChange={(event) => patch("title", event.target.value)}
          placeholder="z. B. Runde am Freitag"
          required
        />
        <div className="grid grid-cols-2 gap-3">
          <TextField
            id="lfg-date"
            label="Datum (optional)"
            type="date"
            value={form.plannedAt}
            onChange={(event) => patch("plannedAt", event.target.value)}
          />
          <TextField
            id="lfg-max"
            label="Max. Teilnehmer"
            type="number"
            min={2}
            value={form.maxParticipants}
            onChange={(event) =>
              patch("maxParticipants", Number(event.target.value))
            }
          />
        </div>
        <TextAreaField
          id="lfg-desc"
          label="Beschreibung"
          rows={3}
          value={form.description}
          onChange={(event) => patch("description", event.target.value)}
          placeholder="Worauf freust du dich, wen suchst du?"
          required
        />
      </div>
    </ActionDialog>
  );
}
