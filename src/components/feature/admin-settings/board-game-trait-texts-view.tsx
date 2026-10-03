"use client";

import { useState } from "react";
import { BoardGameTraitTone, type BoardGameTrait } from "@prisma/client";
import { PageHeading } from "@/components/ui/page-heading";
import { PageContainer } from "@/components/ui/page-container";
import { Button } from "@/components/ui/button";
import { Field, TextField, TextAreaField } from "@/components/ui/field";
import { useAction } from "@/components/ui/use-action";
import { cn } from "@/lib/utils/cn";
import {
  NOTIFICATION_BANNER_CLASS,
  NOTIFICATION_ICON_CLASS,
  NOTIFICATION_TONE_ICON,
  BOARD_GAME_TRAIT_TONE_TO_NOTIFICATION_TYPE,
} from "@/components/entities/notification-tone";
import { updateBoardGameTraitText } from "@/components/feature/admin-settings/board-game-trait-texts-actions";
import {
  BOARD_GAME_TRAIT_FALLBACK_LABELS,
  type BoardGameTraitTextData,
} from "@/lib/ludothek/board-game-traits";

const TONE_OPTIONS = Object.values(BoardGameTraitTone);
const TONE_LABELS: Record<BoardGameTraitTone, string> = {
  [BoardGameTraitTone.INFO]: "Info",
  [BoardGameTraitTone.WARNING]: "Warnung",
  [BoardGameTraitTone.DANGER]: "Gefahr",
};

/** Dringlichkeits-Auswahl, die immer im gewählten Ton dargestellt wird
 * (Hintergrund/Text/Icon) — statt eines neutralen Dropdowns mit Textlabel,
 * damit sofort sichtbar ist, wie dringlich der gespeicherte Ton wirkt. */
function ToneSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: BoardGameTraitTone;
  onChange: (tone: BoardGameTraitTone) => void;
}) {
  const notificationType = BOARD_GAME_TRAIT_TONE_TO_NOTIFICATION_TYPE[value];
  const Icon = NOTIFICATION_TONE_ICON[notificationType];

  return (
    <div className="relative">
      <Icon
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2",
          NOTIFICATION_ICON_CLASS[notificationType],
        )}
      />
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as BoardGameTraitTone)}
        className={cn(
          "h-9 w-full rounded-md border pr-3 pl-8 text-sm font-medium",
          NOTIFICATION_BANNER_CLASS[notificationType],
        )}
      >
        {TONE_OPTIONS.map((tone) => (
          <option key={tone} value={tone}>
            {TONE_LABELS[tone]}
          </option>
        ))}
      </select>
    </div>
  );
}

type TraitFormValues = {
  label: string;
  tooltip: string;
  tone: BoardGameTraitTone;
  loanMessage: string;
  detailsMessage: string;
};

function toFormValues(row: BoardGameTraitTextData): TraitFormValues {
  return {
    label: row.label ?? "",
    tooltip: row.tooltip ?? "",
    tone: row.tone,
    loanMessage: row.loanMessage ?? "",
    detailsMessage: row.detailsMessage ?? "",
  };
}

function TraitTextCard({
  trait,
  initial,
}: {
  trait: BoardGameTrait;
  initial: BoardGameTraitTextData;
}) {
  const [form, setForm] = useState<TraitFormValues>(() =>
    toFormValues(initial),
  );
  const { run, pending, error } = useAction({ refresh: false });
  const idPrefix = `trait-text-${trait}`;

  function patch(next: Partial<TraitFormValues>) {
    setForm((prev) => ({ ...prev, ...next }));
  }

  return (
    <div className="bg-card flex flex-col gap-3 rounded-lg border p-4">
      <p className="font-serif text-base font-bold">
        {BOARD_GAME_TRAIT_FALLBACK_LABELS[trait]}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextField
          id={`${idPrefix}-label`}
          label="Pill-Text"
          hint="Nur relevant, wenn dieser Trait als Pill dargestellt wird."
          value={form.label}
          onChange={(event) => patch({ label: event.target.value })}
        />
        <TextField
          id={`${idPrefix}-tooltip`}
          label="Tooltip"
          hint="Nur relevant, wenn dieser Trait als Icon dargestellt wird."
          value={form.tooltip}
          onChange={(event) => patch({ tooltip: event.target.value })}
        />
      </div>
      <Field label="Dringlichkeit" htmlFor={`${idPrefix}-tone`}>
        <ToneSelect
          id={`${idPrefix}-tone`}
          value={form.tone}
          onChange={(tone) => patch({ tone })}
        />
      </Field>
      <TextAreaField
        id={`${idPrefix}-loan-message`}
        label="Hinweis im Verleih-Banner"
        hint="Leer = kein Banner für diesen Trait."
        value={form.loanMessage}
        onChange={(event) => patch({ loanMessage: event.target.value })}
        rows={2}
      />
      <TextAreaField
        id={`${idPrefix}-details-message`}
        label="Ausführlicher Hinweis (Detail-View)"
        value={form.detailsMessage}
        onChange={(event) => patch({ detailsMessage: event.target.value })}
        rows={3}
      />
      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => run(() => updateBoardGameTraitText(trait, form))}
          className="self-start"
        >
          {pending ? "Speichere…" : "Speichern"}
        </Button>
        {error && <p className="text-destructive text-sm">{error}</p>}
      </div>
    </div>
  );
}

/**
 * Eigene Admin-Unterseite für die 5 `BoardGameTraitText`-Zeilen (#487-Konzept)
 * — statt eines Popup-Dialogs, damit genug Raum für fünf vollständige
 * Formulare inkl. Mehrzeilentexten ist. Immer genau 5 feste Zeilen (eine je
 * `BoardGameTrait`) — kein Anlegen/Löschen/Umsortieren, nur Bearbeiten.
 */
export function BoardGameTraitTextsView({
  rows,
}: {
  rows: BoardGameTraitTextData[];
}) {
  return (
    <PageContainer className="gap-6">
      <PageHeading
        eyebrow="Administration"
        title="Spiel-Traits"
        description="Anzeige-Texte & Dringlichkeit je BGG-Trait (Legacy, Kampagne, …) pflegen."
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {rows.map((row) => (
          <TraitTextCard key={row.trait} trait={row.trait} initial={row} />
        ))}
      </div>
    </PageContainer>
  );
}
