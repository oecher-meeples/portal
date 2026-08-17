"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { updateBoardGame } from "@/lib/ludothek/board-games";
import { previewBggImport } from "@/lib/ludothek/board-games-bgg-import";
import { parseBggId } from "@/lib/ludothek/bgg-id";
import { compareBoardGameWithBgg } from "@/lib/ludothek/board-game-bgg-compare";
import { EditBoardGameTitle } from "@/components/widgets/board-game/edit-board-game-title";
import { AlternateNamesManager } from "@/components/widgets/board-game/alternate-names-manager";
import { BggComparePanel } from "@/components/widgets/board-game/bgg-compare-panel";
import {
  boardGameFormToTitleInput,
  boardGameToFormValues,
  type BoardGameFormValues,
  type BoardGameRecord,
} from "@/components/widgets/board-game/board-game-form-values";
import type { BggGameData } from "@/lib/bgg/client";

/** Title-level fields only — the exemplar-specific `condition` doesn't apply
 * here, so it's forced to `null` and never submitted (see `EditBoardGameDialog`
 * for the per-copy variant). */
export type EditableBoardGameTitle = {
  boardGameId: string;
} & Omit<BoardGameRecord, "condition">;

function toFormValues(game: EditableBoardGameTitle) {
  return boardGameToFormValues({ ...game, condition: null });
}

/** Edits a title's shared fields from the detail page header — for
 * `games:manage` holders only (see #121/#122). */
export function EditBoardGameTitleDialog({
  game,
  mechanicsOptions,
}: {
  game: EditableBoardGameTitle;
  /** Every distinct mechanic already in the Bestand — Autocomplete-Vorschläge
   * für das Mechaniken-Multiselect (#124). */
  mechanicsOptions?: string[];
}) {
  const [form, setForm] = useState<BoardGameFormValues>(() =>
    toFormValues(game),
  );
  const [bggCompareData, setBggCompareData] = useState<BggGameData | null>(
    null,
  );
  const [isComparing, setIsComparing] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  function patchForm(patch: Partial<BoardGameFormValues>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function resetCompare() {
    setBggCompareData(null);
    setCompareError(null);
  }

  async function handleCompareWithBgg() {
    const bggId = parseBggId(form.bggId);
    if (!bggId) return;

    setIsComparing(true);
    setCompareError(null);
    try {
      const result = await previewBggImport(bggId);
      if (!result.success) {
        setCompareError(result.error);
        return;
      }
      setBggCompareData(result.data);
    } catch (err) {
      setCompareError(
        err instanceof Error
          ? err.message
          : "Die BGG-Daten konnten nicht geladen werden. Bitte erneut versuchen.",
      );
    } finally {
      setIsComparing(false);
    }
  }

  const compareStatus = bggCompareData
    ? compareBoardGameWithBgg(form, bggCompareData)
    : undefined;

  return (
    <ActionDialog
      trigger={
        <Button size="sm" variant="outline">
          <Pencil className="size-4" />
          Titel bearbeiten
        </Button>
      }
      title="Titel bearbeiten"
      description="Stammdaten korrigieren, u. a. das automatisch übernommene Erklärvideo."
      contentClassName="sm:max-w-4xl"
      submitLabel="Speichern"
      canSubmit={form.title.trim().length > 0}
      action={() =>
        updateBoardGame(game.boardGameId, boardGameFormToTitleInput(form))
      }
      onReset={() => {
        setForm(toFormValues(game));
        resetCompare();
      }}
    >
      <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto pr-1">
        <div className="flex flex-wrap items-center gap-2">
          {parseBggId(form.bggId) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={bggCompareData ? resetCompare : handleCompareWithBgg}
              disabled={isComparing}
            >
              {isComparing
                ? "Lade BGG-Daten…"
                : bggCompareData
                  ? "Abgleich schließen"
                  : "Daten mit BGG abgleichen"}
            </Button>
          )}
        </div>
        {compareError && (
          <p className="text-destructive text-sm">{compareError}</p>
        )}

        <div
          className={
            bggCompareData
              ? "grid grid-cols-1 gap-4 md:grid-cols-[1fr_18rem]"
              : ""
          }
        >
          <EditBoardGameTitle
            idPrefix={`edit-title-${game.boardGameId}`}
            values={form}
            onChange={patchForm}
            mechanicsOptions={mechanicsOptions}
            compareStatus={compareStatus}
          />
          {bggCompareData && (
            <BggComparePanel bggData={bggCompareData} onChange={patchForm} />
          )}
        </div>

        <AlternateNamesManager boardGameId={game.boardGameId} />
      </div>
    </ActionDialog>
  );
}
