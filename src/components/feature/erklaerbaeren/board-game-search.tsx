"use client";

import { useEffect, useState } from "react";
import { CoverMedia } from "@/components/ui/cover-media";
import { SearchInput } from "@/components/ui/search-input";
import { useDebouncedValue } from "@/components/ui/use-debounced-value";
import { searchBoardGamesAction } from "@/lib/explainer/actions";
import type { BoardGameSearchHit } from "@/lib/explainer/game-list";

const SEARCH_DELAY_MS = 300;

/**
 * Titelsuche über **alle** Spiele — getippt, serverseitig, mit Limit, nie
 * vorgeladen. Gemeinsam für das Hinzufügen in Tab 1 (#663) und den
 * Erklärergesuch in Tab 2 (#662); was bei Auswahl passiert, entscheidet der
 * Aufrufer.
 */
export function BoardGameSearch({
  onSelect,
  excludeIds = [],
  placeholder = "Spiel suchen …",
  disabled,
}: {
  onSelect: (hit: BoardGameSearchHit) => void;
  excludeIds?: string[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<BoardGameSearchHit[]>([]);
  const debounced = useDebouncedValue(query.trim(), SEARCH_DELAY_MS);
  const excludeKey = excludeIds.join(",");

  useEffect(() => {
    let cancelled = false;
    if (!debounced) return;
    void searchBoardGamesAction(
      debounced,
      excludeKey ? excludeKey.split(",") : [],
    )
      .then((result) => {
        if (!cancelled) setHits(result);
      })
      .catch(() => {
        if (!cancelled) setHits([]);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, excludeKey]);

  const showHits = query.trim() !== "" && query.trim() === debounced;

  return (
    <div className="flex flex-col gap-1.5">
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder={placeholder}
        className={disabled ? "pointer-events-none opacity-60" : undefined}
      />
      {showHits &&
        (hits.length === 0 ? (
          <p className="text-muted-foreground text-sm">Keine Treffer.</p>
        ) : (
          <ul className="bg-card flex flex-col rounded-md border">
            {hits.map((hit) => (
              <li key={hit.id}>
                <button
                  type="button"
                  disabled={disabled}
                  className="hover:bg-muted flex w-full items-center gap-3 px-3 py-2 text-left text-sm disabled:opacity-60"
                  onClick={() => {
                    onSelect(hit);
                    setQuery("");
                    setHits([]);
                  }}
                >
                  <CoverMedia
                    imageUrl={hit.imageUrl}
                    alt=""
                    aspect="aspect-square"
                    className="w-10 shrink-0"
                    sizes="40px"
                  />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{hit.title}</span>
                    {hit.secondaryTitle && (
                      <span className="text-muted-foreground truncate text-xs">
                        {hit.secondaryTitle}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
