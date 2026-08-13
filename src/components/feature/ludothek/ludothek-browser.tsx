"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, LayoutGrid, List, Rows3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MechanicsFilter } from "@/components/feature/ludothek/mechanics-filter";
import { LudothekResults } from "@/components/feature/ludothek/ludothek-results";
import { useDebouncedValue } from "@/components/ui/use-debounced-value";
import { ScanSearchDialog } from "@/components/ui/scan-search-dialog";
import { CreateBoardGameDialog } from "@/components/widgets/board-game/create-board-game-dialog";
import { buildHref } from "@/lib/utils/query-string";
import type {
  DurationFilter,
  LudothekFilters,
  LudothekGame,
  LudothekViewMode,
  PlayerCountFilter,
  PublicLudothekGame,
} from "@/lib/ludothek/browser";
import type { GameZustand } from "@/lib/ludothek/holdings";
import type { PrivateCollectionResult } from "@/lib/ludothek/private-collection";
import { PlaceholderMedia } from "@/components/ui/placeholder-media";
import { cn } from "@/lib/utils/cn";

const PLAYER_OPTIONS: { label: string; value: PlayerCountFilter }[] = [
  { label: "1–2", value: "1-2" },
  { label: "3–4", value: "3-4" },
  { label: "5+", value: "5+" },
];

const DURATION_OPTIONS: { label: string; value: DurationFilter }[] = [
  { label: "<60’", value: "short" },
  { label: "60–120’", value: "mid" },
  { label: ">120’", value: "long" },
];

const ZUSTAND_OPTIONS: { label: string; value: GameZustand }[] = [
  { label: "Frei", value: "frei" },
  { label: "Ausgeliehen", value: "ausgeliehen" },
  { label: "Wartung", value: "wartung" },
  { label: "Nicht erfasst", value: "nicht-erfasst" },
];

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

function FilterPill({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </Link>
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
  meepleOptions,
  privateCollectionResults,
}: {
  games: (PublicLudothekGame | LudothekGame)[];
  internal: boolean;
  /** Only meaningful when `games` are the unstripped internal shape. */
  canManageGames?: boolean;
  basePath: string;
  rawSearchParams: Record<string, string | string[] | undefined>;
  filters: LudothekFilters;
  mechanicsOptions: string[];
  meepleOptions?: { id: string; displayName: string }[];
  /** Internal-only, never passed for the guest area — see CONTEXT.md "kein Leak". */
  privateCollectionResults?: PrivateCollectionResult[];
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
        <form action={basePath} className="flex gap-2">
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
          <Input
            name="q"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Spiel, EAN oder BGG-ID suchen …"
          />
          <Button type="submit">Suchen</Button>
          <ScanSearchDialog onScanned={setSearch} />
        </form>

        <details className="group">
          <summary className="text-muted-foreground hover:text-foreground flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium select-none">
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
            Filter
          </summary>

          <div className="mt-3 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Spieler
              </span>
              <FilterPill
                label="Alle"
                href={href({ spieler: undefined })}
                active={!filters.players}
              />
              {PLAYER_OPTIONS.map((option) => (
                <FilterPill
                  key={option.value}
                  label={option.label}
                  href={href({ spieler: option.value })}
                  active={filters.players === option.value}
                />
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Dauer
              </span>
              <FilterPill
                label="Alle"
                href={href({ dauer: undefined })}
                active={!filters.duration}
              />
              {DURATION_OPTIONS.map((option) => (
                <FilterPill
                  key={option.value}
                  label={option.label}
                  href={href({ dauer: option.value })}
                  active={filters.duration === option.value}
                />
              ))}
            </div>

            {mechanicsOptions.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  Mechanik
                </span>
                <MechanicsFilter
                  basePath={basePath}
                  rawSearchParams={rawSearchParams}
                  options={mechanicsOptions}
                  selected={filters.mechanics ?? []}
                />
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <FilterPill
                label="Erweiterungen ausblenden"
                href={href({
                  ohneErweiterungen: filters.hideExpansions ? undefined : "1",
                })}
                active={Boolean(filters.hideExpansions)}
              />
            </div>

            {internal && (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                    Zustand
                  </span>
                  <FilterPill
                    label="Alle"
                    href={href({ zustand: undefined })}
                    active={!filters.zustand}
                  />
                  {ZUSTAND_OPTIONS.map((option) => (
                    <FilterPill
                      key={option.value}
                      label={option.label}
                      href={href({ zustand: option.value })}
                      active={filters.zustand === option.value}
                    />
                  ))}
                  <FilterPill
                    label="Ist ausgeliehen"
                    href={href({
                      ausgeliehen: filters.onlyLoanedOut ? undefined : "1",
                    })}
                    active={Boolean(filters.onlyLoanedOut)}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <FilterPill
                    label="Auch Privatbesitz anzeigen"
                    href={href({
                      privatbesitz: filters.showPrivateCollection
                        ? undefined
                        : "1",
                    })}
                    active={Boolean(filters.showPrivateCollection)}
                  />
                  <FilterPill
                    label="Zeige nur Spielergesuche"
                    href={href({
                      nurGesuche: filters.onlyWithOpenLfg ? undefined : "1",
                    })}
                    active={Boolean(filters.onlyWithOpenLfg)}
                  />
                </div>
                {meepleOptions && meepleOptions.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                      Bei
                    </span>
                    <FilterPill
                      label="Alle"
                      href={href({ bei: undefined })}
                      active={!filters.atMeepleId}
                    />
                    {meepleOptions.map((meeple) => (
                      <FilterPill
                        key={meeple.id}
                        label={meeple.displayName}
                        href={href({ bei: meeple.id })}
                        active={filters.atMeepleId === meeple.id}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </details>
      </div>

      <div className="flex items-center justify-between gap-2">
        {canManageGames ? <CreateBoardGameDialog /> : <div />}
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

      {internal &&
        filters.showPrivateCollection &&
        privateCollectionResults &&
        privateCollectionResults.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              Privatbesitz von Mitgliedern
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {privateCollectionResults.map((result) => (
                <div
                  key={result.id}
                  className="bg-card flex flex-col overflow-hidden rounded-lg border"
                >
                  {result.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- external cover url
                    <img
                      src={result.imageUrl}
                      alt={result.title}
                      className="aspect-square w-full object-cover"
                    />
                  ) : (
                    <PlaceholderMedia label="FOTO" />
                  )}
                  <div className="flex flex-1 flex-col gap-1 p-4">
                    <p className="font-serif font-semibold">{result.title}</p>
                    <span className="bg-muted text-muted-foreground w-fit rounded-full px-2 py-0.5 text-xs">
                      im Privatbesitz von {result.ownerDisplayName}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
    </div>
  );
}
