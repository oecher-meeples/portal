"use client";

import { FilterPill } from "@/components/ui/filter-pill";
import { useAction } from "@/components/ui/use-action";
import { BoardGameSearch } from "@/components/feature/erklaerbaeren/board-game-search";
import { ExplainerGameRow } from "@/components/feature/erklaerbaeren/explainer-game-row";
import { erklaerbaerenHref } from "@/components/feature/erklaerbaeren/erklaerbaeren-url";
import { addExplainerGameFromSearch } from "@/lib/explainer/actions";
import type { ExplainerGameRow as Row } from "@/lib/explainer/game-list";
import {
  EXPLAINER_GAME_FILTERS,
  EXPLAINER_GAME_FILTER_HINTS,
  EXPLAINER_GAME_FILTER_LABELS,
  EXPLAINER_GAME_FILTER_SLUGS,
  type ExplainerGameFilter,
} from "@/lib/explainer/game-list";

const EMPTY_TEXT: Record<ExplainerGameFilter, string> = {
  relevant:
    "Noch nichts Relevantes. Suche oben ein Spiel, das du erklären kannst.",
  mine: "Keine eigenen BGG-Spiele importiert.",
  wanted: "Für kein Spiel werden gerade Erklärer gesucht.",
  known: "Du hast noch für kein Spiel ein Niveau eingetragen.",
};

/** Tab 1 „Meine Spiele“ (#663): exklusive Filter, Liste mit Niveau, Suche über
 * alle Spiele zum Hinzufügen. */
export function MyGamesTab({
  games,
  filter,
}: {
  games: Row[];
  filter: ExplainerGameFilter;
}) {
  const { run, pending, error } = useAction();

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Filter" className="flex flex-wrap gap-2">
        {EXPLAINER_GAME_FILTERS.map((key) => (
          <FilterPill
            key={key}
            label={EXPLAINER_GAME_FILTER_LABELS[key]}
            active={key === filter}
            href={erklaerbaerenHref({
              filter:
                key === "relevant"
                  ? undefined
                  : EXPLAINER_GAME_FILTER_SLUGS[key],
            })}
          />
        ))}
      </nav>
      <p className="text-muted-foreground -mt-2 text-sm">
        {EXPLAINER_GAME_FILTER_HINTS[filter]}
      </p>

      <BoardGameSearch
        placeholder="Spiel suchen und hinzufügen …"
        disabled={pending}
        onSelect={(hit) => run(() => addExplainerGameFromSearch(hit.id))}
      />
      {error && <p className="text-destructive text-sm">{error}</p>}

      {games.length === 0 ? (
        <p className="text-muted-foreground text-sm">{EMPTY_TEXT[filter]}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {games.map((game) => (
            <ExplainerGameRow key={game.boardGameId} game={game} />
          ))}
        </ul>
      )}
    </div>
  );
}
