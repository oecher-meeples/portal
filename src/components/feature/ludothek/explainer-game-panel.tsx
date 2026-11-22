"use client";

import { Card, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import type { ExplainerExperienceLevel } from "@prisma/client";
import { ExplainerListDialogTrigger } from "@/components/widgets/explainer/explainer-list-dialog-trigger";
import { useAction } from "@/components/ui/use-action";
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
  const [level, setLevel] = useState<ExplainerExperienceLevel | null>(myLevel);
  // Die Actions revalidieren `/erklaerbaeren`, nicht diese Spielseite.
  const { run, pending: isSubmitting, error } = useAction({ refresh: true });

  async function handleRegister(nextLevel: ExplainerExperienceLevel) {
    setLevel(nextLevel);
    await run(() => addExplainerGame(boardGameId, nextLevel));
  }

  async function handleLevelChange(nextLevel: ExplainerExperienceLevel) {
    setLevel(nextLevel);
    await run(() => updateExplainerGameLevel(boardGameId, nextLevel));
  }

  async function handleRemove() {
    if (await run(() => removeExplainerGame(boardGameId))) setLevel(null);
  }

  return (
    <Card>
      <div className="flex items-center gap-2">
        <CardTitle>Erklärbären</CardTitle>
        <ExplainerListDialogTrigger
          boardGameTitle={boardGameTitle}
          explainers={explainers}
          badgeCount={explainers.length}
        />
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
    </Card>
  );
}
