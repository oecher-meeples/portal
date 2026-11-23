"use client";

import { Card } from "@/components/ui/card";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LayoutGrid, List, Rows3, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LudothekResults } from "@/components/feature/ludothek/ludothek-results";
import { LudothekFilterPanel } from "@/components/feature/ludothek/ludothek-filter-panel";
import { useDebouncedValue } from "@/components/ui/use-debounced-value";
import { SingleSlider } from "@/components/ui/range-slider";
import { useLocalStorageState } from "@/components/ui/use-local-storage-state";
import { useIsMobile } from "@/components/ui/use-media-query";
import { ScanSearchDialog } from "@/components/ui/scan-search-dialog";
import { CreateBoardGameDialog } from "@/components/widgets/board-game/create-board-game-dialog";
import { buildHref } from "@/lib/utils/query-string";
import { classifyScannedSearch } from "@/lib/short-id/short-id";
import type { BoardGameTrait } from "@prisma/client";
import type { BoardGameTraitTextData } from "@/lib/ludothek/board-game-traits";
import type { LudothekFilters, LudothekViewMode } from "@/lib/ludothek/browser";
import type { LudothekClientGame } from "@/lib/ludothek/browse";
import { loadMoreLudothekGames } from "@/components/feature/ludothek/actions";
import { cn } from "@/lib/utils/cn";

/** #446: Kartengröße im Grid — persistiert je Gerät, nicht Teil der
 * URL-Filter (rein optisch, kein Filterkriterium). */
const CARD_MIN_WIDTH_STORAGE_KEY = "ludothek-card-min-width";
const CARD_MIN_WIDTH_DEFAULT = 220;
const CARD_MIN_WIDTH_RANGE = { min: 160, max: 360 };

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
    // #585: auf `< md` ausgeblendet — dort gilt immer das Raster.
    <div className="hidden items-center gap-1 md:flex">
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

type LoadedGames = {
  /** Die zuletzt vom Server gerenderte erste Seite — ändert sie sich, wird
   * neu aufgesetzt (Filterwechsel) bzw. zusammengeführt (`router.refresh`). */
  firstPage: LudothekClientGame[];
  filterKey: string;
  games: LudothekClientGame[];
  nextOffset: number | null;
};

/** Nachgeladene Seiten (#461). Ein Filterwechsel kommt als neue erste Seite
 * mit anderen `searchParams` und setzt auf Seite 1 zurück; ein Refresh mit
 * denselben Filtern (z. B. nach einer Aktion) behält die schon nachgeladenen
 * Titel, damit die Liste nicht unter dem Nutzer zusammenschrumpft. */
function useLudothekPages(
  firstPage: LudothekClientGame[],
  firstNextOffset: number | null,
  rawSearchParams: Record<string, string | string[] | undefined>,
) {
  const filterKey = JSON.stringify(rawSearchParams);
  const [loaded, setLoaded] = useState<LoadedGames>({
    firstPage,
    filterKey,
    games: firstPage,
    nextOffset: firstNextOffset,
  });
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  if (loaded.firstPage !== firstPage) {
    const keepExtras = loaded.filterKey === filterKey;
    setLoaded({
      firstPage,
      filterKey,
      games: keepExtras
        ? appendNewTitles(
            firstPage,
            loaded.games.slice(loaded.firstPage.length),
          )
        : firstPage,
      nextOffset: keepExtras ? loaded.nextOffset : firstNextOffset,
    });
  }

  const loadMore = useCallback(
    async (offset: number) => {
      setIsLoadingMore(true);
      try {
        const page = await loadMoreLudothekGames(rawSearchParams, offset);
        setLoaded((current) => ({
          ...current,
          games: appendNewTitles(current.games, page.games),
          nextOffset: page.nextOffset,
        }));
      } finally {
        setIsLoadingMore(false);
      }
    },
    [rawSearchParams],
  );

  return { ...loaded, isLoadingMore, loadMore };
}

/** Hängt nur Titel an, die noch nicht geladen sind — verschiebt sich der
 * Bestand zwischen zwei Seiten, entsteht so keine doppelte Karte. */
function appendNewTitles(
  current: LudothekClientGame[],
  next: LudothekClientGame[],
) {
  const known = new Set(current.map((game) => game.boardGameId));
  return [...current, ...next.filter((game) => !known.has(game.boardGameId))];
}

export function LudothekBrowser({
  games: firstPage,
  nextOffset: firstNextOffset = null,
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
  traitTexts,
  createInventoryNumber,
}: {
  /** Erste Seite Titel (#461), weitere lädt `loadMoreLudothekGames` nach. */
  games: LudothekClientGame[];
  /** Titel-Offset der zweiten Seite, `null`/weggelassen = schon alles da. */
  nextOffset?: number | null;
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
  /** Admin-editierbare Anzeige-Texte je Trait (#487-Konzept). */
  traitTexts?: Partial<Record<BoardGameTrait, BoardGameTraitTextData>>;
  /** Inventarnummer eines gescannten, unbekannten Exemplar-Etiketts
   * (`?neu=inv-<n>`, #549) — öffnet sofort den Anlegen-Dialog. Nur mit
   * `canManageGames` gesetzt. */
  createInventoryNumber?: number;
}) {
  const router = useRouter();
  const href = (patch: Record<string, string | string[] | undefined>) =>
    buildHref(basePath, rawSearchParams, patch);
  // #585: Liste/Kompakt sind auf `< md` unbrauchbar — dort immer Raster.
  // `?ansicht=` bleibt dabei unangetastet und greift wieder ab `md`.
  const isMobile = useIsMobile();
  const view: LudothekViewMode = isMobile ? "grid" : (filters.view ?? "grid");
  const { games, nextOffset, isLoadingMore, loadMore } = useLudothekPages(
    firstPage,
    firstNextOffset,
    rawSearchParams,
  );

  const [search, setSearch] = useState(filters.search ?? "");
  const debouncedSearch = useDebouncedValue(search);
  const [cardMinWidth, setCardMinWidth] = useLocalStorageState(
    CARD_MIN_WIDTH_STORAGE_KEY,
    CARD_MIN_WIDTH_DEFAULT,
  );

  useEffect(() => {
    if (debouncedSearch === (filters.search ?? "")) return;
    router.replace(href({ q: debouncedSearch || undefined }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to the debounced value settling
  }, [debouncedSearch]);

  // #570: QR-Etiketten öffnen ihr Ziel über den Router statt als Roh-URL
  // im Suchfeld zu landen; EAN/Freitext bleiben Suchtext.
  const [scanHint, setScanHint] = useState<string | null>(null);
  function handleScanned(text: string) {
    const input = classifyScannedSearch(text);
    setScanHint(
      input.kind === "unsupported"
        ? "Meeple-Codes kann die Ludothek-Suche noch nicht auflösen."
        : null,
    );
    if (input.kind === "navigate") router.push(input.href);
    if (input.kind === "search") setSearch(input.text);
  }

  return (
    <div className="flex flex-col gap-5">
      <Card size="sm">
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
          <ScanSearchDialog onScanned={handleScanned} />
        </form>
        {scanHint && (
          <p role="status" className="text-muted-foreground text-sm">
            {scanHint}
          </p>
        )}

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
      </Card>

      <div className="flex items-center justify-between gap-2">
        {canManageGames ? (
          <CreateBoardGameDialog
            defaultBggQuery={search}
            defaultInventoryNumber={createInventoryNumber}
          />
        ) : (
          <div />
        )}
        <div className="flex items-center gap-3">
          {/* #446: nur Grid-Ansicht, nur Desktop — auf Mobile/Tablet
              ausgeblendet, List/Compact bleiben unbeeinflusst. */}
          {view === "grid" && (
            <SingleSlider
              className="hidden w-24 md:flex"
              min={CARD_MIN_WIDTH_RANGE.min}
              max={CARD_MIN_WIDTH_RANGE.max}
              step={10}
              value={cardMinWidth}
              onValueChange={setCardMinWidth}
              getAriaLabel={() => "Kartengröße"}
            />
          )}
          <ViewModeSwitch
            view={view}
            canManageGames={canManageGames}
            href={href}
          />
        </div>
      </div>

      <LudothekResults
        games={games}
        view={view}
        canManageGames={canManageGames}
        mechanicsOptions={mechanicsOptions}
        cardMinWidth={cardMinWidth}
        traitTexts={traitTexts}
        onLoadMore={loadMore}
        cursor={nextOffset}
        hasMore={nextOffset !== null}
        isLoadingMore={isLoadingMore}
      />
    </div>
  );
}
