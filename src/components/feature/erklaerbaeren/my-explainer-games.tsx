"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ExplainerExperienceLevel } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExplainerLevelToggle } from "@/components/entities/explainer-level-toggle";
import {
  addExplainerGame,
  removeExplainerGame,
  updateExplainerGameLevel,
} from "@/lib/explainer/actions";

export type MyExplainerGame = {
  boardGameId: string;
  boardGameTitle: string;
  level: ExplainerExperienceLevel;
};

export type SelectableGame = {
  id: string;
  title: string;
};

function selectClassName() {
  return "border-input h-8 w-full min-w-0 rounded-lg border bg-transparent px-2.5 py-1 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30";
}

export function MyExplainerGames({
  myGames,
  availableGames,
}: {
  myGames: MyExplainerGame[];
  availableGames: SelectableGame[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState("");
  const [selectedGameId, setSelectedGameId] = useState("");
  const [newLevel, setNewLevel] =
    useState<ExplainerExperienceLevel>("WITH_MANUAL");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ownGameIds = useMemo(
    () => new Set(myGames.map((game) => game.boardGameId)),
    [myGames],
  );

  const filteredGames = useMemo(() => {
    const query = filter.trim().toLowerCase();
    return availableGames
      .filter((game) => !ownGameIds.has(game.id))
      .filter((game) => !query || game.title.toLowerCase().includes(query));
  }, [availableGames, ownGameIds, filter]);

  async function handleAdd() {
    if (!selectedGameId) return;
    setIsSubmitting(true);
    setError(null);

    const result = await addExplainerGame(selectedGameId, newLevel);
    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSelectedGameId("");
    setFilter("");
    router.refresh();
  }

  async function handleLevelChange(
    boardGameId: string,
    level: ExplainerExperienceLevel,
  ) {
    setError(null);
    const result = await updateExplainerGameLevel(boardGameId, level);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleRemove(boardGameId: string) {
    setError(null);
    await removeExplainerGame(boardGameId);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-card flex flex-col gap-3 rounded-lg border p-4">
        <p className="font-medium">Neues Spiel hinzufügen</p>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="explainer-filter">Spiel suchen</Label>
          <Input
            id="explainer-filter"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="z. B. Arche Nova"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="explainer-game">Spiel</Label>
            <select
              id="explainer-game"
              className={selectClassName()}
              value={selectedGameId}
              onChange={(event) => setSelectedGameId(event.target.value)}
            >
              <option value="">Spiel auswählen…</option>
              {filteredGames.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.title}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Erfahrungsstufe</Label>
            <ExplainerLevelToggle value={newLevel} onChange={setNewLevel} />
          </div>
        </div>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <Button
          onClick={handleAdd}
          disabled={!selectedGameId || isSubmitting}
          className="w-fit"
        >
          {isSubmitting ? "Speichere…" : "Hinzufügen"}
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {myGames.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Du bist noch für kein Spiel als Erklärbär eingetragen.
          </p>
        )}
        {myGames.map((game) => (
          <div
            key={game.boardGameId}
            className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
          >
            <span className="font-medium">{game.boardGameTitle}</span>
            <div className="flex items-center gap-2">
              <ExplainerLevelToggle
                value={game.level}
                onChange={(level) =>
                  handleLevelChange(game.boardGameId, level)
                }
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRemove(game.boardGameId)}
              >
                Entfernen
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
