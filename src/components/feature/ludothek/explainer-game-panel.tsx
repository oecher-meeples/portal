"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import type { ExplainerExperienceLevel } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
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
  const [level, setLevel] = useState<ExplainerExperienceLevel | null>(myLevel);
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
    setLevel(null);
    router.refresh();
  }

  return (
    <div className="bg-card flex flex-col gap-3 rounded-lg border p-5">
      <div className="flex items-center gap-2">
        <h2 className="font-serif text-lg font-bold">Erklärbären</h2>
        <Dialog>
          <Tooltip content="Alle Erklärbären ansehen">
            <DialogTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="relative"
                  aria-label="Alle Erklärbären ansehen"
                >
                  <Search className="size-4" />
                  {explainers.length > 0 && (
                    <Badge className="absolute -top-1.5 -right-1.5 h-4 min-w-4 justify-center px-1 text-[10px]">
                      {explainers.length}
                    </Badge>
                  )}
                </Button>
              }
            />
          </Tooltip>
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
