import Link from "next/link";
import { ScanLine } from "lucide-react";
import { GameCard } from "@/components/entities/game-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  DurationFilter,
  LudothekFilters,
  LudothekGame,
  PlayerCountFilter,
  PublicLudothekGame,
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

function buildHref(
  basePath: string,
  current: Record<string, string | string[] | undefined>,
  patch: Record<string, string | string[] | undefined>,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(current)) {
    if (key in patch || value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) params.append(key, v);
    } else {
      params.set(key, value);
    }
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) params.append(key, v);
    } else {
      params.set(key, value);
    }
  }
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
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
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );
}

export function LudothekBrowser({
  games,
  internal,
  basePath,
  rawSearchParams,
  filters,
  mechanicsOptions,
  meepleOptions,
}: {
  games: (PublicLudothekGame | LudothekGame)[];
  internal: boolean;
  basePath: string;
  rawSearchParams: Record<string, string | string[] | undefined>;
  filters: LudothekFilters;
  mechanicsOptions: string[];
  meepleOptions?: { id: string; displayName: string }[];
}) {
  const href = (patch: Record<string, string | string[] | undefined>) =>
    buildHref(basePath, rawSearchParams, patch);

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
            defaultValue={filters.search ?? ""}
            placeholder="Spiel suchen …"
          />
          <Button type="submit">Suchen</Button>
          <Button
            variant="outline"
            className="gap-2"
            render={
              <Link href="/scan">
                <ScanLine className="size-4" />
                Scannen
              </Link>
            }
          />
        </form>

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
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              Mechanik
            </span>
            {mechanicsOptions.map((mechanic) => {
              const selected = filters.mechanics?.includes(mechanic) ?? false;
              const nextMechanics = selected
                ? (filters.mechanics ?? []).filter((m) => m !== mechanic)
                : [...(filters.mechanics ?? []), mechanic];
              return (
                <FilterPill
                  key={mechanic}
                  label={mechanic}
                  href={href({ mechanik: nextMechanics })}
                  active={selected}
                />
              );
            })}
          </div>
        )}

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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {games.map((game) => (
          <GameCard key={game.slug} game={game} />
        ))}
        {games.length === 0 && (
          <p className="text-muted-foreground col-span-full text-sm">
            Keine Spiele gefunden.
          </p>
        )}
      </div>
    </div>
  );
}
