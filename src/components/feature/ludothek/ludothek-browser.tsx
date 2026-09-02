"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LayoutGrid, List, Rows3, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LudothekResults } from "@/components/feature/ludothek/ludothek-results";
import { LudothekFilterPanel } from "@/components/feature/ludothek/ludothek-filter-panel";
import { useDebouncedValue } from "@/components/ui/use-debounced-value";
import { ScanSearchDialog } from "@/components/ui/scan-search-dialog";
import { CreateBoardGameDialog } from "@/components/widgets/board-game/create-board-game-dialog";
import { buildHref } from "@/lib/utils/query-string";
import type {
  LudothekFilters,
  LudothekGame,
  LudothekViewMode,
  PublicLudothekGame,
} from "@/lib/ludothek/browser";
import { cn } from "@/lib/utils/cn";

const VIEW_MODE_OPTIONS: {
  value: LudothekViewMode;
  label: string;
  icon: typeof LayoutGrid;
}[] = [
  { value: "grid", label: "Raster", icon: LayoutGrid },
  { value: "liste", label: "Liste", icon: List },
  { value: "compact", label: "Kompakt", icon: Rows3 },
];

function ViewModeSwitch({
  view,
  canManageGames,
  href,
}: {
  view: LudothekViewMode;
  canManageGames: boolean;
  href: (patch: Record<string, string | string[] | undefined>) => string;
}) {
  return (
    <div className="flex items-center gap-1">
      {VIEW_MODE_OPTIONS.filter(
        (option) => option.value !== "compact" || canManageGames,
      ).map((option) => (
        <Link
          key={option.value}
          href={href({
            ansicht: option.value === "grid" ? undefined : option.value,
          })}
          aria-label={option.label}
          aria-current={view === option.value ? "true" : undefined}
          className={cn(
            "flex size-8 items-center justify-center rounded-md border transition-colors",
            view === option.value
              ? "border-primary bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <option.icon className="size-4" />
        </Link>
      ))}
    </div>
  );
}

export function LudothekBrowser({
  games,
  internal,
  canManageGames = false,
  basePath,
  rawSearchParams,
  filters,
  mechanicsOptions,
  categoriesOptions,
  maxDurationBound = 120,
  meepleOptions,
  showExplainerFilter = true,
  showPresentFilter = false,
}: {
  games: (PublicLudothekGame | LudothekGame)[];
  internal: boolean;
  /** Only meaningful when `games` are the unstripped internal shape. */
  canManageGames?: boolean;
  basePath: string;
  rawSearchParams: Record<string, string | string[] | undefined>;
  filters: LudothekFilters;
  mechanicsOptions: string[];
  /** BGGs Categories, analog `mechanicsOptions` — nur für den Filter (#404). */
  categoriesOptions: string[];
  /** Obergrenze für den Dauer-Slider — höchster im Bestand erfasster Wert,
   * s. `findMaxDurationBound` (#214-Folge). Der Spieler-Slider hat eine feste
   * Obergrenze ("8+"), s. `MAX_PLAYERS_FILTER` (#214-Folge-Korrektur). */
  maxDurationBound?: number;
  meepleOptions?: { id: string; displayName: string }[];
  /** "Erklärbär vorhanden"-Filter (#256) — für Meeples immer sichtbar
   * (Default), für Gäste nur, solange ein Event läuft. */
  showExplainerFilter?: boolean;
  /** "Nur anwesende Spiele"-Filter (#273) — nur sichtbar, solange ein Event
   * läuft, für Meeples wie Gäste gleichermaßen. Default aus, da meistens
   * kein Event läuft. */
  showPresentFilter?: boolean;
}) {
  const router = useRouter();
  const href = (patch: Record<string, string | string[] | undefined>) =>
    buildHref(basePath, rawSearchParams, patch);

  const [search, setSearch] = useState(filters.search ?? "");
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    if (debouncedSearch === (filters.search ?? "")) return;
    router.replace(href({ q: debouncedSearch || undefined }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to the debounced value settling
  }, [debouncedSearch]);

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-card flex flex-col gap-3 rounded-lg border p-4">
        <form
          action={basePath}
          onSubmit={(event) => {
            event.preventDefault();
            router.replace(href({ q: search || undefined }));
          }}
          className="flex gap-2"
        >
          {Object.entries(rawSearchParams)
            .filter(([key]) => key !== "q")
            .flatMap(([key, value]) =>
              (Array.isArray(value) ? value : [value]).map(
                (v, i) =>
                  v !== undefined && (
                    <input
                      key={`${key}-${i}`}
                      type="hidden"
                      name={key}
                      value={v}
                    />
                  ),
              ),
            )}
          <div className="relative flex-1">
            <Input
              name="q"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Spiel, EAN oder BGG-ID suchen …"
              className={search ? "pr-8" : undefined}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Suche leeren"
                className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-2 flex items-center"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <Button type="submit">Suchen</Button>
          <ScanSearchDialog onScanned={setSearch} />
        </form>

        <LudothekFilterPanel
          href={href}
          filters={filters}
          internal={internal}
          mechanicsOptions={mechanicsOptions}
          categoriesOptions={categoriesOptions}
          maxDurationBound={maxDurationBound}
          basePath={basePath}
          rawSearchParams={rawSearchParams}
          meepleOptions={meepleOptions}
          showExplainerFilter={showExplainerFilter}
          showPresentFilter={showPresentFilter}
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        {canManageGames ? (
          <CreateBoardGameDialog defaultBggQuery={search} />
        ) : (
          <div />
        )}
        <ViewModeSwitch
          view={filters.view ?? "grid"}
          canManageGames={canManageGames}
          href={href}
        />
      </div>

      <LudothekResults
        games={games}
        view={filters.view ?? "grid"}
        canManageGames={canManageGames}
        mechanicsOptions={mechanicsOptions}
      />
    </div>
  );
}
