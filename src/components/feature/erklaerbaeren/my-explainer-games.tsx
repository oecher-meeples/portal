"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { ExplainerExperienceLevel } from "@prisma/client";
import { ActionButton } from "@/components/ui/action-button";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import {
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
} from "@/components/ui/combobox";
import { ExplainerLevelSlider } from "@/components/entities/explainer-level-slider";
import { useAction } from "@/components/ui/use-action";
import {
  addExplainerGame,
  removeAllExplainerGames,
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
  const [filter, setFilter] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [selectedGame, setSelectedGame] = useState<SelectableGame | null>(null);
  const [selectedLevel, setSelectedLevel] =
    useState<ExplainerExperienceLevel>("WITH_MANUAL");
  const levelAction = useAction();
  const error = levelAction.error;

  const ownGameIds = useMemo(
    () => new Set(myGames.map((game) => game.boardGameId)),
    [myGames],
  );

  const selectableGames = useMemo(
    () => availableGames.filter((game) => !ownGameIds.has(game.id)),
    [availableGames, ownGameIds],
  );

  const filteredGames = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return myGames;
    return myGames.filter((game) =>
      game.boardGameTitle.toLowerCase().includes(term),
    );
  }, [myGames, filter]);

  function handleSelect(title: string | null) {
    setSelectedGame(
      selectableGames.find((game) => game.title === title) ?? null,
    );
  }

  function resetDialog() {
    setInputValue("");
    setSelectedGame(null);
    setSelectedLevel("WITH_MANUAL");
  }

  function handleLevelChange(
    boardGameId: string,
    level: ExplainerExperienceLevel,
  ) {
    levelAction.run(() => updateExplainerGameLevel(boardGameId, level));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-serif text-xl font-semibold">
          Das kann ich erklären:
        </h2>
        <ActionDialog
          trigger={
            <Button>
              <Plus className="size-4" />
              Neues Spiel hinzufügen
            </Button>
          }
          title="Neues Spiel hinzufügen"
          submitLabel="Hinzufügen"
          canSubmit={selectedGame !== null}
          action={() => addExplainerGame(selectedGame?.id ?? "", selectedLevel)}
          onReset={resetDialog}
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="explainer-search">Spiel suchen</Label>
              <Combobox
                items={selectableGames.map((game) => game.title)}
                value={selectedGame?.title ?? null}
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
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Erfahrungsstufe</Label>
              <ExplainerLevelSlider
                value={selectedLevel}
                onChange={setSelectedLevel}
              />
            </div>
          </div>
        </ActionDialog>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {myGames.length > 0 && (
        <TextField
          id="explainer-filter"
          label="Spiele filtern"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          onClear={() => setFilter("")}
          placeholder="Spielname …"
        />
      )}

      <div className="flex flex-col gap-2">
        {myGames.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Du bist noch für kein Spiel als Erklärbär eingetragen.
          </p>
        )}
        {myGames.length > 0 && filteredGames.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Kein Spiel passt zum Filter.
          </p>
        )}
        {filteredGames.map((game) => (
          <div
            key={game.boardGameId}
            className="bg-card flex items-center gap-4 rounded-lg border p-3"
          >
            <span className="max-w-[30%] truncate font-medium">
              {game.boardGameTitle}
            </span>
            <ExplainerLevelSlider
              value={game.level}
              onChange={(level) => handleLevelChange(game.boardGameId, level)}
              className="ml-auto w-1/2"
            />
            <ActionButton
              variant="destructive"
              size="sm"
              className="shrink-0"
              confirm={`${game.boardGameTitle} wirklich als Erklärbär-Eintrag entfernen?`}
              action={() => removeExplainerGame(game.boardGameId)}
            >
              <Trash2 className="size-4" />
              Entfernen
            </ActionButton>
          </div>
        ))}
      </div>

      {myGames.length > 0 && (
        <ActionButton
          variant="destructive"
          size="sm"
          className="self-end"
          confirm="Wirklich alle eigenen Erklärbär-Einträge entfernen?"
          action={() => removeAllExplainerGames()}
        >
          <Trash2 className="size-4" />
          Alle Spiele entfernen
        </ActionButton>
      )}
    </div>
  );
}
