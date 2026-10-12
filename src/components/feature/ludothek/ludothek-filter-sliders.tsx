"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { RangeSlider, SingleSlider } from "@/components/ui/range-slider";
import {
  MAX_PLAYERS_FILTER,
  type LudothekFilters,
} from "@/lib/ludothek/browser";
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

/** Die fünf Zwei-/Ein-Knoten-Slider-Filter (Spieler, Dauer, Erstveröffent-
 * lichung, Bewertung, Sprachneutralität) von `LudothekFilterPanel` —
 * ausgelagert, da die Panel-Datei sonst die 400-Zeilen-Grenze reißt
 * (#205, #214-Folge, #188). */
export function LudothekFilterSliders({
  href,
  filters,
  maxDurationBound,
}: {
  href: (patch: Record<string, string | string[] | undefined>) => string;
  filters: LudothekFilters;
  /** Obergrenze für den Dauer-Slider, s. `findMaxDurationBound` (#214-Folge). */
  maxDurationBound: number;
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
    <>
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
    </>
  );
}
