"use client";

import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { FilterPill } from "@/components/ui/filter-pill";
import { MeepleCombobox } from "@/components/entities/meeple-combobox";
import { LudothekMultiSelectFilter } from "@/components/feature/ludothek/ludothek-multi-select-filter";
import { LudothekContributorFilter } from "@/components/feature/ludothek/ludothek-contributor-filter";
import { LudothekFilterSliders } from "@/components/feature/ludothek/ludothek-filter-sliders";
import type { LudothekFilters } from "@/lib/ludothek/browser";
import type { GameZustand } from "@/lib/ludothek/holdings";

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

  return (
    <details className="group">
      <summary className="text-muted-foreground hover:text-foreground flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium select-none">
        <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
        Filter
      </summary>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-3">
        <LudothekFilterSliders
          href={href}
          filters={filters}
          maxDurationBound={maxDurationBound}
        />

        <div className="flex w-full flex-wrap gap-x-5 gap-y-3 border-t pt-4">
          <LudothekContributorFilter
            id="verlag-filter"
            label="Verlag"
            placeholder="z. B. Feuerland Spiele"
            value={filters.publisher}
            onCommit={(publisher) =>
              router.replace(href({ verlag: publisher || undefined }))
            }
          />
          <LudothekContributorFilter
            id="autor-filter"
            label="Autor"
            placeholder="z. B. Uwe Rosenberg"
            value={filters.author}
            onCommit={(author) =>
              router.replace(href({ autor: author || undefined }))
            }
          />
          <LudothekContributorFilter
            id="illustrator-filter"
            label="Illustrator"
            placeholder="z. B. Klemens Franz"
            value={filters.illustrator}
            onCommit={(illustrator) =>
              router.replace(href({ illustrator: illustrator || undefined }))
            }
          />
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
