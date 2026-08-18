"use client";

import { useState } from "react";
import type { BoardGameKind } from "@prisma/client";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
} from "@/components/ui/combobox";
import { CreateBoardGameDialog } from "@/components/widgets/board-game/create-board-game-dialog";
import { assignExpansion } from "@/lib/ludothek/board-games";

export type GameOption = { id: string; title: string };

/**
 * Manual base game ↔ expansion assignment trigger for `games:manage`
 * holders — BGG import is blocked by #12, so this is the only way to link
 * them (#30). Just the trigger + dialog; removing an existing assignment
 * happens on the `RelatedGameCard` itself (Plan-Schritt 4/5), not here.
 *
 * Durchsuchbare Combobox statt eines nativen Dropdowns (#204) — findet die
 * Suche keinen Treffer, öffnet der `ComboboxEmpty`-Zustand denselben
 * 3-Schritt-Anlegen-Dialog wie überall sonst, verschachtelt. Der neu
 * angelegte (oder wiederverwendete) Titel wird automatisch übernommen, auch
 * wenn er noch nicht in `options` steht — das Prop wird erst nach dem
 * nächsten Server-Render aktuell.
 */
export function AssignExpansionDialog({
  game,
  options,
}: {
  game: { id: string; kind: BoardGameKind };
  /** Candidate games to link — excludes `game` itself and already-linked entries. */
  options: GameOption[];
}) {
  const [selectedId, setSelectedId] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [justCreated, setJustCreated] = useState<GameOption | null>(null);
  const isExpansion = game.kind === "BOARDGAME_EXPANSION";

  const allOptions =
    justCreated && !options.some((option) => option.id === justCreated.id)
      ? [...options, justCreated]
      : options;
  const selectedTitle =
    allOptions.find((option) => option.id === selectedId)?.title ?? null;

  function reset() {
    setSelectedId("");
    setInputValue("");
    setJustCreated(null);
  }

  return (
    <ActionDialog
      trigger={
        <Button variant="outline" size="sm">
          {isExpansion ? "Basisspiel zuordnen" : "Erweiterung hinzufügen"}
        </Button>
      }
      title={isExpansion ? "Basisspiel zuordnen" : "Erweiterung hinzufügen"}
      submitLabel="Zuordnen"
      canSubmit={selectedId !== ""}
      action={() =>
        isExpansion
          ? assignExpansion(selectedId, game.id)
          : assignExpansion(game.id, selectedId)
      }
      onReset={reset}
    >
      <Combobox
        items={allOptions.map((option) => option.title)}
        value={selectedTitle}
        inputValue={inputValue}
        onInputValueChange={setInputValue}
        onValueChange={(title) => {
          const selected = allOptions.find((option) => option.title === title);
          setSelectedId(selected?.id ?? "");
        }}
      >
        <ComboboxInput placeholder="Titel suchen …" />
        <ComboboxPopup>
          <ComboboxEmpty>
            <div className="flex flex-col gap-1.5 p-1">
              <p>Keine Treffer.</p>
              <CreateBoardGameDialog
                defaultBggQuery={inputValue}
                onCreated={(created) => {
                  setJustCreated(created);
                  setSelectedId(created.id);
                  setInputValue(created.title);
                }}
              />
            </div>
          </ComboboxEmpty>
          <ComboboxList>
            {(title: string) => (
              <ComboboxItem key={title} value={title}>
                {title}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxPopup>
      </Combobox>
    </ActionDialog>
  );
}
