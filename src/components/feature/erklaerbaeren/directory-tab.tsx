"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { CoverMedia } from "@/components/ui/cover-media";
import { FilterPill } from "@/components/ui/filter-pill";
import { StopRowNavigation } from "@/components/ui/stop-row-navigation";
import { SearchInput } from "@/components/ui/search-input";
import { useDebouncedValue } from "@/components/ui/use-debounced-value";
import { useAction } from "@/components/ui/use-action";
import { ExplainerListDialogTrigger } from "@/components/widgets/explainer/explainer-list-dialog-trigger";
import { BoardGameSearch } from "@/components/feature/erklaerbaeren/board-game-search";
import { GameTitleLink } from "@/components/feature/erklaerbaeren/game-title-link";
import { erklaerbaerenHref } from "@/components/feature/erklaerbaeren/erklaerbaeren-url";
import { cn } from "@/lib/utils/cn";
import { setExplainerWanted } from "@/lib/explainer/actions";
import {
  EXPLAINER_DIRECTORY_FILTER_HINTS,
  EXPLAINER_DIRECTORY_FILTER_LABELS,
  EXPLAINER_DIRECTORY_FILTER_SLUGS,
  type ExplainerDirectoryEntry,
  type ExplainerDirectoryFilter,
} from "@/lib/explainer/game-list";

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
  const addWanted = useAction();
  const filterSlug = EXPLAINER_DIRECTORY_FILTER_SLUGS[filter];
  const isWantedFilter = filter === "wanted";

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
      <p className="text-muted-foreground -mt-2 text-sm">
        {EXPLAINER_DIRECTORY_FILTER_HINTS[filter]}
      </p>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Spieltitel suchen …"
      />

      <div
        className={cn("grid gap-6", isWantedFilter && "lg:grid-cols-[2fr_1fr]")}
      >
        {isWantedFilter && (
          <Card className="gap-3 self-start lg:sticky lg:top-24 lg:order-last">
            <CardTitle>Erklärergesuch hinzufügen</CardTitle>
            <p className="text-muted-foreground text-sm">
              Such ein Spiel und wähle es aus: Es wird sofort als „Erklärer
              gesucht“ markiert. Alle Mitglieder sehen es dann im Filter
              „Gesucht“ und als Hinweis im Dashboard.
            </p>
            <BoardGameSearch
              placeholder="Spiel suchen …"
              excludeIds={entries.map((e) => e.boardGameId)}
              disabled={addWanted.pending}
              onSelect={(hit) =>
                addWanted.run(() => setExplainerWanted(hit.id, true))
              }
            />
            {addWanted.error && (
              <p className="text-destructive text-sm">{addWanted.error}</p>
            )}
          </Card>
        )}
        <div>
          {entries.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {filter === "wanted"
                ? "Für kein Spiel werden Erklärer gesucht."
                : "Kein Spiel mit Erklärbär gefunden."}
            </p>
          ) : (
            <ul
              className={cn(
                "grid grid-cols-1 gap-3 sm:grid-cols-2",
                isWantedFilter ? "xl:grid-cols-2" : "lg:grid-cols-3",
              )}
            >
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
                      secondaryTitle={entry.secondaryTitle}
                      slug={entry.slug}
                    />
                  </div>
                  <ExplainerListDialogTrigger
                    display="count"
                    boardGameTitle={entry.boardGameTitle}
                    explainers={entry.explainers}
                  />
                  {isWantedFilter && (
                    <StopRowNavigation>
                      <ActionDialog
                        trigger={
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon-sm"
                            aria-label={`Erklärergesuch für ${entry.boardGameTitle} entfernen`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        }
                        title="Erklärergesuch entfernen"
                        description={`„${entry.boardGameTitle}“ wird nicht mehr als „Erklärer gesucht“ markiert.`}
                        submitLabel="Entfernen"
                        submitVariant="destructive"
                        action={() =>
                          setExplainerWanted(entry.boardGameId, false)
                        }
                      />
                    </StopRowNavigation>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
