"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createBoardGame,
  updateBoardGame,
  type CreateBoardGameInput,
} from "@/lib/ludothek/board-games";
import { createGameCopy } from "@/lib/ludothek/game-copies";
import {
  boardGameFormToInput,
  boardGameFormToTitleInput,
  type BoardGameFormValues,
} from "@/components/widgets/board-game/board-game-form-values";
import type { LocationPlacement } from "@/components/widgets/board-game/create-board-game-location-field";
import type { BggGameData } from "@/lib/bgg/client";

/**
 * Owns the Anlegen-Dialog's Speichern-Flow — pulled out of
 * `create-board-game-dialog.tsx` purely for the file's size (ESLint
 * `max-lines`), not for reuse elsewhere. Includes the EAN-Recovery (#322):
 * `handleSubmit(eanOverride)` lets the caller resubmit with the EAN cleared
 * without waiting for a `patchForm` state update to land first.
 */
export function useCreateBoardGameSubmit({
  form,
  existingBoardGame,
  correctingExistingTitle,
  placement,
  preview,
  onCreated,
  onSuccess,
}: {
  form: BoardGameFormValues;
  existingBoardGame: { id: string } | null;
  correctingExistingTitle: boolean;
  placement: LocationPlacement | null;
  preview: BggGameData | null;
  onCreated?: (game: { id: string; title: string }) => void;
  /** Called once the save (title/exemplar) fully succeeded. */
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [invalidEan, setInvalidEan] = useState(false);
  const [lastHint, setLastHint] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function resetSubmitState() {
    setError(null);
    setInvalidEan(false);
  }

  async function handleSubmit(eanOverride?: string) {
    resetSubmitState();
    setIsSubmitting(true);
    const eanPatch = eanOverride !== undefined ? { ean: eanOverride } : {};

    try {
      if (existingBoardGame) {
        if (correctingExistingTitle) {
          const updateResult = await updateBoardGame(existingBoardGame.id, {
            ...boardGameFormToTitleInput(form),
            ...eanPatch,
          });
          if (updateResult.error) {
            setError(updateResult.error);
            setInvalidEan(Boolean(updateResult.invalidEan));
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
        onCreated?.({ id: existingBoardGame.id, title: form.title });
      } else {
        const input: CreateBoardGameInput = {
          ...boardGameFormToInput(form),
          ...(placement ? { placement } : {}),
          ...eanPatch,
          alternateNames: preview?.alternateNames,
        };
        const result = await createBoardGame(input);
        if (result.error) {
          setError(result.error);
          setInvalidEan(Boolean(result.invalidEan));
          return;
        }
        setLastHint(result.hint ?? null);
        // `result.error` above already excludes the error branch — TS just
        // doesn't narrow `boardGameId` off of it (a plain `string` field,
        // not a literal discriminant), same gap `result.hint` silently has too.
        onCreated?.({ id: result.boardGameId as string, title: form.title });
      }

      onSuccess();
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

  return {
    handleSubmit,
    error,
    setError,
    invalidEan,
    lastHint,
    isSubmitting,
    resetSubmitState,
  };
}
