"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  createBoardGame,
  updateBoardGame,
  type CreateBoardGameInput,
} from "@/lib/ludothek/board-games";
import {
  previewBggImport,
  searchBggGamesAction,
} from "@/lib/ludothek/board-games-bgg-import";
import { createGameCopy } from "@/lib/ludothek/game-copies";
import { extractBggIdFromLink, parseBggId } from "@/lib/ludothek/bgg-id";
import { CreateBoardGameBggImportStep } from "@/components/widgets/board-game/create-board-game-bgg-import-step";
import { CreateBoardGameDialogFooter } from "@/components/widgets/board-game/create-board-game-dialog-footer";
import { BoardGameDuplicateWarning } from "@/components/widgets/board-game/board-game-duplicate-warning";
import { useBoardGameDuplicateGuard } from "@/components/widgets/board-game/use-board-game-duplicate-guard";
import { EditBoardGameTitle } from "@/components/widgets/board-game/edit-board-game-title";
import { CreateBoardGameExemplarStep } from "@/components/widgets/board-game/create-board-game-exemplar-step";
import { type LocationPlacement } from "@/components/widgets/board-game/create-board-game-location-field";
import {
  EMPTY_BOARD_GAME_FORM,
  boardGameFormToInput,
  boardGameFormToTitleInput,
  boardGameToFormValues,
  type BoardGameFormValues,
} from "@/components/widgets/board-game/board-game-form-values";
import type { BggGameData, BggSearchResult } from "@/lib/bgg/client";

type Step = 1 | 2 | 3;

const STEP_LABELS: Record<Step, string> = {
  1: "BGG-Import",
  2: "Angaben prüfen",
  3: "Exemplar-Daten",
};

export function CreateBoardGameDialog({
  defaultEan,
  defaultBggQuery,
}: {
  defaultEan?: string;
  /** Übernimmt eine bereits eingegebene Ludothek-Suche als Startwert für den
   * BGG-Import (#183) — Admin sucht z. B. schon nach einem Titel, der noch
   * fehlt, und muss ihn nicht ein zweites Mal eintippen. */
  defaultBggQuery?: string;
} = {}) {
  const router = useRouter();
  const [open, setOpen] = useState(Boolean(defaultEan));
  // Ein Scan identifiziert die physische Kopie bereits eindeutig — der
  // BGG-Import-Schritt bringt dann nichts, direkt zur manuellen Prüfung.
  const [step, setStep] = useState<Step>(defaultEan ? 2 : 1);
  const [bggInput, setBggInput] = useState(defaultBggQuery ?? "");
  const [searchResults, setSearchResults] = useState<BggSearchResult[] | null>(
    null,
  );
  const [preview, setPreview] = useState<BggGameData | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [form, setForm] = useState<BoardGameFormValues>({
    ...EMPTY_BOARD_GAME_FORM,
    ean: defaultEan ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [lastHint, setLastHint] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [placement, setPlacement] = useState<LocationPlacement | null>(null);

  const {
    activeDuplicate,
    existingBoardGame,
    correctingExistingTitle,
    isLoadingTitle,
    checkDuplicate,
    reset: resetDuplicateGuard,
    selectExistingCopyTarget,
    loadExistingTitleRecord,
  } = useBoardGameDuplicateGuard({
    step,
    title: form.title,
    bggIdText: form.bggId,
  });

  function patchForm(patch: Partial<BoardGameFormValues>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function reset() {
    setStep(defaultEan ? 2 : 1);
    // Kein Rückgriff auf `defaultBggQuery` hier — der nächste Öffnen-Klick
    // übernimmt ohnehin den dann aktuellen Wert (siehe `onOpenChange` unten).
    setBggInput("");
    setSearchResults(null);
    setPreview(null);
    resetDuplicateGuard();
    setForm({ ...EMPTY_BOARD_GAME_FORM, ean: defaultEan ?? "" });
    setError(null);
    setPlacement(null);
  }

  /** Wechselt direkt zu Schritt 3, um dem gefundenen Titel statt eines neuen
   * ein weiteres Exemplar hinzuzufügen — der einzige Weg, einen bereits
   * vorhandenen Titel „anzulegen" (#183, verhindert Titel-Duplikate). */
  function handleUseExistingCopy() {
    if (!selectExistingCopyTarget()) return;
    setError(null);
    setStep(3);
  }

  /** Übernimmt die echten Bestandsdaten des gefundenen Titels ins Formular,
   * statt die Eingabe zu verwerfen — Korrekturen bleiben möglich, bevor
   * Schritt 3 die Kopie (und ggf. die Korrektur) anlegt (#183). */
  async function handleLoadExistingTitle() {
    try {
      const record = await loadExistingTitleRecord();
      if (!record) {
        setError("Titel wurde nicht gefunden.");
        return;
      }
      setForm(boardGameToFormValues({ ...record, condition: null }));
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Der Titel konnte nicht geladen werden. Bitte erneut versuchen.",
      );
    }
  }

  /** Lädt die BGG-Vorschau für eine bekannte ID. `false`, wenn nichts gefunden wurde. */
  async function loadPreview(bggId: number): Promise<boolean> {
    try {
      const result = await previewBggImport(bggId);
      if (!result.success) {
        setError(result.error);
        return false;
      }

      setSearchResults(null);
      setPreview(result.data);
      patchForm({
        title: result.data.title,
        bggId: String(bggId),
        minPlayers: result.data.minPlayers?.toString() ?? "",
        maxPlayers: result.data.maxPlayers?.toString() ?? "",
        playTimeMinutes: result.data.playTimeMinutes?.toString() ?? "",
        weight: result.data.weight?.toString() ?? "",
        imageUrl: result.data.imageUrl ?? "",
        description: result.data.description ?? "",
        mechanics: result.data.mechanics.join(", "),
        // Bei mehreren/einzelnen deutschsprachigen Treffern entscheidet der
        // Admin bewusst über die Auswahlliste (#185) — sonst wie bisher der
        // erste instruktive Video-Treffer, automatisch übernommen.
        explainerVideoUrl:
          result.data.germanExplainerVideos.length > 0
            ? ""
            : (result.data.explainerVideoUrl ?? ""),
      });
      // `hint` steht nur bei fehlgeschlagener Übersetzung — kein Hard-
      // Error, die Vorschau ist trotzdem nutzbar, nur ohne automatische
      // deutsche Beschreibung (#184, nie englischen Text speichern).
      setError(result.hint ?? null);
      await checkDuplicate(result.data.title, bggId);
      return true;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Die BGG-Vorschau konnte nicht geladen werden. Bitte erneut versuchen.",
      );
      return false;
    }
  }

  async function runTitleSearch(query: string) {
    try {
      const result = await searchBggGamesAction(query);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setError(null);
      setSearchResults(result.results);
      if (result.results.length === 0) {
        setError("Keine Treffer auf BoardGameGeek gefunden.");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Die BGG-Suche ist fehlgeschlagen. Bitte erneut versuchen.",
      );
    }
  }

  /**
   * Ein Feld, drei Interpretationen: Link → Thing-ID extrahieren und importieren;
   * reine Zahl → als BGG-ID importieren, bei „nicht gefunden" als Titel weitersuchen;
   * alles andere → Namenssuche.
   */
  async function handleResolveBggInput() {
    const trimmed = bggInput.trim();
    if (!trimmed) return;

    setError(null);
    setSearchResults(null);
    setPreview(null);
    resetDuplicateGuard();
    setIsResolving(true);
    try {
      const linkId = extractBggIdFromLink(trimmed);
      if (linkId !== null) {
        await loadPreview(linkId);
        return;
      }

      const numericId = parseBggId(trimmed);
      if (numericId !== null) {
        const found = await loadPreview(numericId);
        if (found) return;
      }

      await runTitleSearch(trimmed);
    } finally {
      setIsResolving(false);
    }
  }

  async function handleSelectResult(bggId: number) {
    setIsResolving(true);
    try {
      await loadPreview(bggId);
    } finally {
      setIsResolving(false);
    }
  }

  function handleSkipImport() {
    setError(null);
    setStep(2);
  }

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);

    try {
      if (existingBoardGame) {
        if (correctingExistingTitle) {
          const updateResult = await updateBoardGame(
            existingBoardGame.id,
            boardGameFormToTitleInput(form),
          );
          if (updateResult.error) {
            setError(updateResult.error);
            return;
          }
        }

        const result = await createGameCopy(existingBoardGame.id, {
          condition: form.condition || undefined,
          ...(placement ? { placement } : {}),
        });
        if (result.error) {
          setError(result.error);
          return;
        }
        setLastHint(null);
      } else {
        const input: CreateBoardGameInput = {
          ...boardGameFormToInput(form),
          ...(placement ? { placement } : {}),
          alternateNames: preview?.alternateNames,
        };
        const result = await createBoardGame(input);
        if (result.error) {
          setError(result.error);
          return;
        }
        setLastHint(result.hint ?? null);
      }

      setOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Das Spiel konnte nicht angelegt werden. Bitte erneut versuchen.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // Ohne bekannten Zieltitel braucht es einen Titel, um einen neuen anzulegen;
  // mit bekanntem Zieltitel legen wir ohnehin nur ein weiteres Exemplar an.
  const canSubmit = existingBoardGame ? true : form.title.trim().length > 0;

  return (
    <div className="flex flex-col items-end gap-2">
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (nextOpen) {
            // Erst beim tatsächlichen Öffnen übernehmen — ein Prop-Update
            // allein aktualisiert den bereits gemounteten `useState`-Wert
            // nicht, und über die Suche synchron zu bleiben wäre gegen den
            // debounce-verzögerten Such-State ohnehin zu langsam (#183).
            setBggInput(defaultBggQuery ?? "");
          } else {
            reset();
          }
        }}
      >
        <DialogTrigger
          render={
            <Button className="gap-1.5">
              <Plus className="size-4" />
              Spiel anlegen
            </Button>
          }
        />
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Neues Spiel anlegen</DialogTitle>
            <DialogDescription>
              Schritt {step} von 3 — {STEP_LABELS[step]}
            </DialogDescription>
          </DialogHeader>

          {step === 1 && (
            <CreateBoardGameBggImportStep
              bggInput={bggInput}
              onBggInputChange={setBggInput}
              onResolve={handleResolveBggInput}
              isResolving={isResolving}
              searchResults={searchResults}
              onSelectResult={handleSelectResult}
              preview={preview}
              selectedExplainerVideoUrl={form.explainerVideoUrl}
              onSelectExplainerVideo={(url) =>
                patchForm({ explainerVideoUrl: url })
              }
            />
          )}

          {step === 2 && (
            <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto pr-1">
              <EditBoardGameTitle
                idPrefix="game"
                values={form}
                onChange={patchForm}
                titleWarning={Boolean(activeDuplicate)}
                onLoadExistingTitle={handleLoadExistingTitle}
                loadingExistingTitle={isLoadingTitle}
                eanAutoSearch
                eanAlternateTitles={preview?.alternateNames}
              />
            </div>
          )}

          {step === 3 && (
            <CreateBoardGameExemplarStep
              values={form}
              onChange={patchForm}
              onPlacementResolved={setPlacement}
              placement={placement}
              existingBoardGame={existingBoardGame}
              correctingExistingTitle={correctingExistingTitle}
            />
          )}

          {activeDuplicate && step !== 3 && (
            <BoardGameDuplicateWarning duplicate={activeDuplicate} />
          )}

          {error && <p className="text-destructive text-sm">{error}</p>}

          <CreateBoardGameDialogFooter
            step={step}
            hasActiveDuplicate={Boolean(activeDuplicate)}
            hasPreview={Boolean(preview)}
            canSubmit={canSubmit}
            isSubmitting={isSubmitting}
            onSkipImport={handleSkipImport}
            onUseExistingCopy={handleUseExistingCopy}
            onBack={() => setStep(step === 3 ? 2 : 1)}
            onNext={() => setStep(step === 1 ? 2 : 3)}
            onSubmit={handleSubmit}
          />
        </DialogContent>
      </Dialog>
      {lastHint && <p className="text-sm text-amber-600">{lastHint}</p>}
    </div>
  );
}
