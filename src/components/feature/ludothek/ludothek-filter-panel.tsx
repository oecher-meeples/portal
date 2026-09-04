"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { RangeSlider, SingleSlider } from "@/components/ui/range-slider";
import { FilterPill } from "@/components/ui/filter-pill";
import { MeepleCombobox } from "@/components/entities/meeple-combobox";
import { LudothekMultiSelectFilter } from "@/components/feature/ludothek/ludothek-multi-select-filter";
import {
  MAX_PLAYERS_FILTER,
  type LudothekFilters,
} from "@/lib/ludothek/browser";
import type { GameZustand } from "@/lib/ludothek/holdings";
import {
  LANGUAGE_DEPENDENCE_BY_LEVEL,
  LANGUAGE_DEPENDENCE_SHORT_LABELS,
} from "@/lib/ludothek/language-dependence";
import { formatDurationHours } from "@/lib/ludothek/format";

const MIN_YEAR = 1900;
const MIN_RATING = 1;
const MAX_RATING = 10;
/** Slider-Position 0 = "Alle" (kein Spieler-Filter), davor liegt nichts mehr. */
const ALL_PLAYERS = 0;
const MIN_DURATION = 0;
const MIN_LANGUAGE_DEPENDENCE = 0;
const MAX_LANGUAGE_DEPENDENCE = LANGUAGE_DEPENDENCE_BY_LEVEL.length;

const ZUSTAND_OPTIONS: { label: string; value: GameZustand }[] = [
  { label: "Frei", value: "frei" },
  { label: "Ausgeliehen", value: "ausgeliehen-verfuegbar" },
  {
    label: "Ausgeliehen (nicht verfügbar)",
    value: "ausgeliehen-nicht-verfuegbar",
  },
  { label: "Wartung", value: "wartung" },
  { label: "Nicht erfasst", value: "nicht-erfasst" },
];

/** Label-Zeile (Titel + aktueller Wert) über einem der fünf Slider unten —
 * war fünfmal identisch dupliziert, DRY-Ort bleibt diese Datei (die
 * Kombination Titel+Wert+Slider ist fachlich an die Filter hier gebunden,
 * kein fachfreier `ui/`-Baustein). */
function FilterSliderRow({
  label,
  value,
  children,
}: {
  label: string;
  value: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-56 flex-1 flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
          {label}
        </span>
        <span className="text-muted-foreground text-xs">{value}</span>
      </div>
      {children}
    </div>
  );
}

/**
 * Die einklappbare "Filter"-Sektion von `LudothekBrowser` — ausgelagert, da
 * die Datei sonst die 400-Zeilen-Grenze reißt. Verwaltet Erstveröffentlichung,
 * Bewertung und Dauer als Zwei-Knoten-Slider sowie Spieler als Ein-Knoten-
 * Slider selbst (#205, #214-Folge); alle anderen Filter sind feste Optionen,
 * die direkt per Link (`href`) gesetzt werden.
 */
export function LudothekFilterPanel({
  href,
  filters,
  internal,
  mechanicsOptions,
  categoriesOptions,
  maxDurationBound,
  basePath,
  rawSearchParams,
  meepleOptions,
  showExplainerFilter = true,
  showPresentFilter = false,
}: {
  href: (patch: Record<string, string | string[] | undefined>) => string;
  filters: LudothekFilters;
  internal: boolean;
  mechanicsOptions: string[];
  /** BGGs Categories, analog `mechanicsOptions` (#404). */
  categoriesOptions: string[];
  /** Obergrenze für den Dauer-Slider, s. `findMaxDurationBound` (#214-Folge). */
  maxDurationBound: number;
  basePath: string;
  rawSearchParams: Record<string, string | string[] | undefined>;
  meepleOptions?: { id: string; displayName: string }[];
  /** "Erklärbär vorhanden"-Filter (#256). */
  showExplainerFilter?: boolean;
  /** "Nur anwesende Spiele"-Filter (#273). */
  showPresentFilter?: boolean;
}) {
  const router = useRouter();
  const currentYear = new Date().getFullYear();

  // Spieleranzahl (#214-Folge-Korrektur) — Ein-Knoten-Slider statt fester
  // Buckets: zeigt Titel, die genau diese Anzahl unterstützen. Position 0 =
  // "Alle" (kein Filter), davor liegt nichts mehr.
  const [players, setPlayers] = useState(filters.players ?? ALL_PLAYERS);

  // Spieldauer von/bis in Minuten (#214-Folge) — gleiches Muster.
  const [durationRange, setDurationRange] = useState<[number, number]>([
    filters.durationFrom ?? MIN_DURATION,
    filters.durationTo ?? maxDurationBound,
  ]);

  // Erstveröffentlichung von/bis (#205) — Slider von 1900 bis heute statt
  // fester Optionen; Grenzwerte (= "kein Filter") werden nicht in die URL
  // geschrieben, analog zum früheren leeren Textfeld.
  const [yearRange, setYearRange] = useState<[number, number]>([
    filters.yearFrom ?? MIN_YEAR,
    filters.yearTo ?? currentYear,
  ]);

  // BGG-Durchschnittsbewertung von/bis (#214-Folge) — gleiches Muster, fixer
  // Wertebereich 1–10 statt eines dynamischen Endes.
  const [ratingRange, setRatingRange] = useState<[number, number]>([
    filters.ratingFrom ?? MIN_RATING,
    filters.ratingTo ?? MAX_RATING,
  ]);

  // Sprachneutralität (#188) — Ein-Knoten-Slider über BGGs 5-stufiges
  // Language-Dependence-Poll-Level; 0 = "Alle" (kein Filter), sonst maximal
  // zulässiges Level.
  const [languageDependenceMax, setLanguageDependenceMax] = useState(
    filters.languageDependenceMax ?? MIN_LANGUAGE_DEPENDENCE,
  );

  function commitYearRange([from, to]: [number, number]) {
    router.replace(
      href({
        jahrVon: from > MIN_YEAR ? String(from) : undefined,
        jahrBis: to < currentYear ? String(to) : undefined,
      }),
    );
  }

  function commitRatingRange([from, to]: [number, number]) {
    router.replace(
      href({
        bewertungVon: from > MIN_RATING ? String(from) : undefined,
        bewertungBis: to < MAX_RATING ? String(to) : undefined,
      }),
    );
  }

  function commitPlayers(next: number) {
    router.replace(
      href({ spieler: next > ALL_PLAYERS ? String(next) : undefined }),
    );
  }

  function commitDurationRange([from, to]: [number, number]) {
    router.replace(
      href({
        dauerVon: from > MIN_DURATION ? String(from) : undefined,
        dauerBis: to < maxDurationBound ? String(to) : undefined,
      }),
    );
  }

  function commitLanguageDependenceMax(next: number) {
    router.replace(
      href({
        sprache: next > MIN_LANGUAGE_DEPENDENCE ? String(next) : undefined,
      }),
    );
  }

  return (
    <details className="group">
      <summary className="text-muted-foreground hover:text-foreground flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium select-none">
        <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
        Filter
      </summary>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-3">
        <FilterSliderRow
          label="Spieler"
          value={
            players <= ALL_PLAYERS
              ? "Alle"
              : players >= MAX_PLAYERS_FILTER
                ? `${MAX_PLAYERS_FILTER}+`
                : players
          }
        >
          <SingleSlider
            min={ALL_PLAYERS}
            max={MAX_PLAYERS_FILTER}
            value={players}
            onValueChange={setPlayers}
            onValueCommitted={commitPlayers}
            getAriaLabel={() => "Spieler"}
            hideTrackFill
          />
        </FilterSliderRow>

        <FilterSliderRow
          label="Dauer"
          value={`${formatDurationHours(durationRange[0])} – ${formatDurationHours(durationRange[1])}`}
        >
          <RangeSlider
            min={MIN_DURATION}
            max={maxDurationBound}
            step={5}
            value={durationRange}
            onValueChange={setDurationRange}
            onValueCommitted={commitDurationRange}
            getAriaLabel={(index) => (index === 0 ? "Dauer von" : "Dauer bis")}
          />
        </FilterSliderRow>

        <FilterSliderRow
          label="Erstveröffentlichung"
          value={`${yearRange[0]} – ${yearRange[1]}`}
        >
          <RangeSlider
            min={MIN_YEAR}
            max={currentYear}
            value={yearRange}
            onValueChange={setYearRange}
            onValueCommitted={commitYearRange}
            getAriaLabel={(index) =>
              index === 0
                ? "Erstveröffentlichung von"
                : "Erstveröffentlichung bis"
            }
          />
        </FilterSliderRow>

        <FilterSliderRow
          label="Bewertung"
          value={`${ratingRange[0]} – ${ratingRange[1]}`}
        >
          <RangeSlider
            min={MIN_RATING}
            max={MAX_RATING}
            value={ratingRange}
            onValueChange={setRatingRange}
            onValueCommitted={commitRatingRange}
            getAriaLabel={(index) =>
              index === 0 ? "Bewertung von" : "Bewertung bis"
            }
          />
        </FilterSliderRow>

        <FilterSliderRow
          label="Sprachneutralität"
          value={
            languageDependenceMax <= MIN_LANGUAGE_DEPENDENCE
              ? "Alle"
              : LANGUAGE_DEPENDENCE_SHORT_LABELS[
                  LANGUAGE_DEPENDENCE_BY_LEVEL[languageDependenceMax - 1]
                ]
          }
        >
          <SingleSlider
            min={MIN_LANGUAGE_DEPENDENCE}
            max={MAX_LANGUAGE_DEPENDENCE}
            value={languageDependenceMax}
            onValueChange={setLanguageDependenceMax}
            onValueCommitted={commitLanguageDependenceMax}
            getAriaLabel={() => "Sprachneutralität"}
            hideTrackFill
          />
        </FilterSliderRow>

        {(mechanicsOptions.length > 0 || categoriesOptions.length > 0) && (
          <div className="flex w-full flex-wrap gap-x-5 gap-y-3 border-t pt-4">
            {mechanicsOptions.length > 0 && (
              <div className="flex min-w-56 flex-1 flex-col gap-1.5">
                <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  Mechanik
                </span>
                <LudothekMultiSelectFilter
                  id="mechanik-filter"
                  paramKey="mechanik"
                  basePath={basePath}
                  rawSearchParams={rawSearchParams}
                  options={mechanicsOptions}
                  selected={filters.mechanics ?? []}
                  placeholder="Mechanik suchen …"
                  emptyLabel="Keine passende Mechanik"
                />
              </div>
            )}

            {categoriesOptions.length > 0 && (
              <div className="flex min-w-56 flex-1 flex-col gap-1.5">
                <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  Kategorie
                </span>
                <LudothekMultiSelectFilter
                  id="kategorie-filter"
                  paramKey="kategorie"
                  basePath={basePath}
                  rawSearchParams={rawSearchParams}
                  options={categoriesOptions}
                  selected={filters.categories ?? []}
                  placeholder="Kategorie suchen …"
                  emptyLabel="Keine passende Kategorie"
                />
              </div>
            )}
          </div>
        )}

        {/* Unabhängige Ein/Aus-Filter (Checkbox-artig, beliebig kombinierbar)
            in einer gemeinsamen Gruppe statt verstreuter Einzelzeilen —
            klare Abgrenzung zu "Zustand" darunter, das eine Einzelauswahl
            ist. */}
        <div className="flex w-full flex-col gap-2 border-t pt-4">
          <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            Weitere Filter
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <FilterPill
              label="Erweiterungen ausblenden"
              href={href({
                ohneErweiterungen: filters.hideExpansions ? undefined : "1",
              })}
              active={Boolean(filters.hideExpansions)}
            />
            {showExplainerFilter && (
              <FilterPill
                label="Erklärbär vorhanden"
                href={href({
                  erklaerbaer: filters.hasExplainer ? undefined : "1",
                })}
                active={Boolean(filters.hasExplainer)}
              />
            )}
            {showPresentFilter && (
              <FilterPill
                label="Nur anwesende Spiele"
                href={href({
                  anwesend: filters.onlyPresentAtEvent ? undefined : "1",
                })}
                active={Boolean(filters.onlyPresentAtEvent)}
              />
            )}
            {internal && (
              <FilterPill
                label="Zeige nur Spielergesuche"
                href={href({
                  nurGesuche: filters.onlyWithOpenLfg ? undefined : "1",
                })}
                active={Boolean(filters.onlyWithOpenLfg)}
              />
            )}
          </div>
        </div>

        {internal && (
          <>
            <div className="flex w-full flex-col gap-2 border-t pt-4">
              <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Zustand
              </span>
              <div className="flex flex-wrap items-center gap-2">
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
            </div>
            <div className="flex w-full flex-col gap-2 border-t pt-4">
              {meepleOptions && meepleOptions.length > 0 && (
                <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  Bei
                </span>
              )}
              {/* items-center statt items-end: die Texte von "Alle" und der
                  Pill sollen sich die mittlere Baseline teilen, nicht die
                  untere Kante. Deshalb ohne das "Bei"-Label in dieser Zeile
                  — sonst zieht dessen Zeile den Mittelpunkt nach oben. */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                {meepleOptions && meepleOptions.length > 0 && (
                  <div className="flex-1">
                    <MeepleCombobox
                      options={meepleOptions}
                      value={filters.atMeepleId ?? null}
                      onValueChange={(meepleId) =>
                        router.push(href({ bei: meepleId ?? undefined }))
                      }
                      placeholder="Alle"
                    />
                  </div>
                )}
                <FilterPill
                  label="Auch Privatbesitz anzeigen"
                  href={href({
                    privatbesitz: filters.showPrivateCollection
                      ? undefined
                      : "1",
                  })}
                  active={Boolean(filters.showPrivateCollection)}
                  className="shrink-0"
                />
              </div>
            </div>
          </>
        )}
      </div>
    </details>
  );
}
