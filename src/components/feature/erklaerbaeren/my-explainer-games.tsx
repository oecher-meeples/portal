"use client";

import { useMemo, useState } from "react";
import type { ExplainerExperienceLevel } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
} from "@/components/ui/combobox";
import { ExplainerLevelToggle } from "@/components/entities/explainer-level-toggle";
import { useAction } from "@/components/ui/use-action";
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

export function MyExplainerGames({
  myGames,
  availableGames,
}: {
  myGames: MyExplainerGame[];
  availableGames: SelectableGame[];
}) {
  const [inputValue, setInputValue] = useState("");
  const addAction = useAction({
    onSuccess: () => setInputValue(""),
  });
  const levelAction = useAction();
  const removeAction = useAction();
  const error = addAction.error ?? levelAction.error ?? removeAction.error;

  const ownGameIds = useMemo(
    () => new Set(myGames.map((game) => game.boardGameId)),
    [myGames],
  );

  const selectableGames = useMemo(
    () => availableGames.filter((game) => !ownGameIds.has(game.id)),
    [availableGames, ownGameIds],
  );

  function handleSelect(title: string | null) {
    const selected = selectableGames.find((game) => game.title === title);
    if (!selected) return;
    addAction.run(() => addExplainerGame(selected.id, "WITH_MANUAL"));
  }

  function handleLevelChange(
    boardGameId: string,
    level: ExplainerExperienceLevel,
  ) {
    levelAction.run(() => updateExplainerGameLevel(boardGameId, level));
  }

  function handleRemove(boardGameId: string) {
    removeAction.run(() => removeExplainerGame(boardGameId));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-card flex flex-col gap-3 rounded-lg border p-4">
        <p className="font-medium">Neues Spiel hinzufügen</p>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="explainer-search">Spiel suchen</Label>
          <Combobox
            items={selectableGames.map((game) => game.title)}
            value={null}
            inputValue={inputValue}
            onInputValueChange={setInputValue}
            onValueChange={handleSelect}
          >
            <ComboboxInput
              id="explainer-search"
              placeholder="z. B. Arche Nova"
            />
            <ComboboxPopup>
              <ComboboxEmpty>Keine Treffer</ComboboxEmpty>
              <ComboboxList>
                {(title: string) => (
                  <ComboboxItem key={title} value={title}>
                    {title}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxPopup>
          </Combobox>
          <p className="text-muted-foreground text-xs">
            Auswahl trägt dich mit der Erfahrungsstufe „Kann es mit Anleitung
            erklären“ ein — danach unten per Quick-Edit änderbar.
          </p>
        </div>
        {addAction.pending && (
          <p className="text-muted-foreground text-sm">Speichere…</p>
        )}
        {error && <p className="text-destructive text-sm">{error}</p>}
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
                onChange={(level) => handleLevelChange(game.boardGameId, level)}
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
