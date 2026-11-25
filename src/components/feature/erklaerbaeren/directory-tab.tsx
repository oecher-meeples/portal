"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CoverMedia } from "@/components/ui/cover-media";
import { FilterPill } from "@/components/ui/filter-pill";
import { SearchInput } from "@/components/ui/search-input";
import { useDebouncedValue } from "@/components/ui/use-debounced-value";
import { ExplainerListDialogTrigger } from "@/components/widgets/explainer/explainer-list-dialog-trigger";
import { GameTitleLink } from "@/components/feature/erklaerbaeren/game-title-link";
import { erklaerbaerenHref } from "@/components/feature/erklaerbaeren/erklaerbaeren-url";
import {
  EXPLAINER_DIRECTORY_FILTER_LABELS,
  EXPLAINER_DIRECTORY_FILTER_SLUGS,
  type ExplainerDirectoryEntry,
  type ExplainerDirectoryFilter,
} from "@/lib/explainer/directory-queries";

const FILTERS: ExplainerDirectoryFilter[] = ["all", "wanted"];

/** Tab 2 „Erklärbär-Verzeichnis“ (#664), nur für `events:manage`: Grid mit
 * Erklärer-Anzahl je Spiel, Titel-Suche und die Filter Alle | Gesucht. */
export function DirectoryTab({
  entries,
  filter,
  query,
}: {
  entries: ExplainerDirectoryEntry[];
  filter: ExplainerDirectoryFilter;
  query: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(query);
  const debounced = useDebouncedValue(search.trim(), 300);
  const filterSlug = EXPLAINER_DIRECTORY_FILTER_SLUGS[filter];

  useEffect(() => {
    if (debounced === query) return;
    router.replace(
      erklaerbaerenHref({
        tab: "verzeichnis",
        filter: filterSlug,
        q: debounced,
      }),
    );
  }, [debounced, query, filterSlug, router]);

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Filter" className="flex flex-wrap gap-2">
        {FILTERS.map((key) => (
          <FilterPill
            key={key}
            label={EXPLAINER_DIRECTORY_FILTER_LABELS[key]}
            active={key === filter}
            href={erklaerbaerenHref({
              tab: "verzeichnis",
              filter: EXPLAINER_DIRECTORY_FILTER_SLUGS[key],
              q: search.trim(),
            })}
          />
        ))}
      </nav>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Spieltitel suchen …"
      />

      {entries.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {filter === "wanted"
            ? "Für kein Spiel werden Erklärer gesucht."
            : "Kein Spiel mit Erklärbär gefunden."}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => (
            <li
              key={entry.boardGameId}
              className="bg-card flex items-center gap-3 rounded-lg border p-3"
            >
              <CoverMedia
                imageUrl={entry.imageUrl}
                alt=""
                aspect="aspect-square"
                className="w-14 shrink-0"
                sizes="56px"
              />
              <div className="min-w-0 flex-1">
                <GameTitleLink
                  title={entry.boardGameTitle}
                  bggId={entry.bggId}
                />
              </div>
              <ExplainerListDialogTrigger
                display="count"
                boardGameTitle={entry.boardGameTitle}
                explainers={entry.explainers}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
