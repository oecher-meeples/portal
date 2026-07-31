"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ExplainerExperienceLevel } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ExplainerBadgeList } from "@/components/entities/explainer-badge-list";
import { ExplainerLevelToggle } from "@/components/entities/explainer-level-toggle";
import {
  addExplainerGame,
  removeExplainerGame,
  updateExplainerGameLevel,
} from "@/lib/explainer/actions";
import type { ExplainerEntry } from "@/lib/explainer/queries";

export function ExplainerGamePanel({
  boardGameId,
  boardGameTitle,
  explainers,
  myLevel,
}: {
  boardGameId: string;
  boardGameTitle: string;
  explainers: ExplainerEntry[];
  /** null: eingeloggt, aber noch nicht als Erklärbär für dieses Spiel gemeldet. */
  myLevel: ExplainerExperienceLevel | null;
}) {
  const router = useRouter();
  const [level, setLevel] = useState<ExplainerExperienceLevel>(
    myLevel ?? "WITH_MANUAL",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister(nextLevel: ExplainerExperienceLevel) {
    setLevel(nextLevel);
    setIsSubmitting(true);
    setError(null);
    const result = await addExplainerGame(boardGameId, nextLevel);
    setIsSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleLevelChange(nextLevel: ExplainerExperienceLevel) {
    setLevel(nextLevel);
    setError(null);
    const result = await updateExplainerGameLevel(boardGameId, nextLevel);
    if (result.error) {
      setError(result.error);
    }
    router.refresh();
  }

  async function handleRemove() {
    setIsSubmitting(true);
    setError(null);
    await removeExplainerGame(boardGameId);
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <div className="bg-card flex flex-col gap-3 rounded-lg border p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-serif text-lg font-bold">Erklärbären</h2>
        <Dialog>
          <DialogTrigger
            render={
              <Button variant="outline" size="sm">
                {explainers.length > 0
                  ? `Alle ansehen (${explainers.length})`
                  : "Ansehen"}
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Erklärbären für {boardGameTitle}</DialogTitle>
            </DialogHeader>
            <ExplainerBadgeList
              explainers={explainers}
              emptyLabel="Noch niemand als Erklärbär für dieses Spiel gemeldet."
            />
          </DialogContent>
        </Dialog>
      </div>

      {myLevel === null ? (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Ich kann das erklären</span>
          <ExplainerLevelToggle
            value={level}
            onChange={handleRegister}
            disabled={isSubmitting}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Du kannst das erklären</span>
          <ExplainerLevelToggle
            value={level}
            onChange={handleLevelChange}
            onDeselect={handleRemove}
            disabled={isSubmitting}
          />
        </div>
      )}
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
