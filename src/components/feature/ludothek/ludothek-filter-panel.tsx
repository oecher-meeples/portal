"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { MechanicsFilter } from "@/components/feature/ludothek/mechanics-filter";
import { useDebouncedValue } from "@/components/ui/use-debounced-value";
import { cn } from "@/lib/utils/cn";
import type {
  DurationFilter,
  LudothekFilters,
  PlayerCountFilter,
} from "@/lib/ludothek/browser";
import type { GameZustand } from "@/lib/ludothek/holdings";

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

/**
 * Die einklappbare "Filter"-Sektion von `LudothekBrowser` — ausgelagert, da
 * die Datei sonst die 400-Zeilen-Grenze reißt. Verwaltet den Erstveröffentlichung-
 * Von/Bis-Zahlenbereich selbst (debounced wie die Suche, #205); alle anderen
 * Filter sind feste Optionen, die direkt per Link (`href`) gesetzt werden.
 */
export function LudothekFilterPanel({
  href,
  filters,
  internal,
  mechanicsOptions,
  basePath,
  rawSearchParams,
  meepleOptions,
}: {
  href: (patch: Record<string, string | string[] | undefined>) => string;
  filters: LudothekFilters;
  internal: boolean;
  mechanicsOptions: string[];
  basePath: string;
  rawSearchParams: Record<string, string | string[] | undefined>;
  meepleOptions?: { id: string; displayName: string }[];
}) {
  const router = useRouter();

  // Erstveröffentlichung von/bis (#205) — freier Zahlenbereich statt fester
  // Optionen, deshalb wie die Suche debounced statt als Filter-Pills.
  const [yearFrom, setYearFrom] = useState(filters.yearFrom?.toString() ?? "");
  const [yearTo, setYearTo] = useState(filters.yearTo?.toString() ?? "");
  const debouncedYearFrom = useDebouncedValue(yearFrom);
  const debouncedYearTo = useDebouncedValue(yearTo);

  useEffect(() => {
    const current = filters.yearFrom?.toString() ?? "";
    if (debouncedYearFrom === current) return;
    router.replace(href({ jahrVon: debouncedYearFrom || undefined }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to the debounced value settling
  }, [debouncedYearFrom]);

  useEffect(() => {
    const current = filters.yearTo?.toString() ?? "";
    if (debouncedYearTo === current) return;
    router.replace(href({ jahrBis: debouncedYearTo || undefined }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to the debounced value settling
  }, [debouncedYearTo]);

  return (
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

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            Erstveröffentlichung
          </span>
          <Input
            type="number"
            value={yearFrom}
            onChange={(event) => setYearFrom(event.target.value)}
            placeholder="Von"
            aria-label="Erstveröffentlichung von"
            className="h-8 w-24"
          />
          <span className="text-muted-foreground text-sm">–</span>
          <Input
            type="number"
            value={yearTo}
            onChange={(event) => setYearTo(event.target.value)}
            placeholder="Bis"
            aria-label="Erstveröffentlichung bis"
            className="h-8 w-24"
          />
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
                  privatbesitz: filters.showPrivateCollection ? undefined : "1",
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
  );
}
