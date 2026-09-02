"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  GameCombobox,
  type GameOption,
} from "@/components/entities/game-combobox";
import { cn } from "@/lib/utils/cn";
import { buildHref } from "@/lib/utils/query-string";
import type { LfgListFilters } from "@/lib/content/lfg";

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
 * Filter-Panel der LFG-Übersicht (#409) — ersetzt den bisherigen einfachen
 * "Auch vergangene anzeigen"-Toggle-Link. URL-Search-Param-basiert, analog
 * `LudothekFilterPanel`.
 */
export function LfgFilterPanel({
  basePath,
  rawSearchParams,
  filters,
  gameOptions,
}: {
  basePath: string;
  rawSearchParams: Record<string, string | string[] | undefined>;
  filters: LfgListFilters;
  gameOptions: GameOption[];
}) {
  const router = useRouter();
  const href = (patch: Record<string, string | string[] | undefined>) =>
    buildHref(basePath, rawSearchParams, patch);

  return (
    <div className="bg-card flex flex-col gap-3 rounded-lg border p-4">
      {gameOptions.length > 0 && (
        <div className="flex max-w-xs flex-col gap-1">
          <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            Spiel
          </span>
          <GameCombobox
            options={gameOptions}
            value={filters.boardGameId ?? null}
            onValueChange={(boardGameId) =>
              router.push(href({ spiel: boardGameId ?? undefined }))
            }
            placeholder="Alle"
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
          Status
        </span>
        <FilterPill
          label="Alle"
          href={href({ status: undefined })}
          active={!filters.status}
        />
        <FilterPill
          label="Frei"
          href={href({
            status: filters.status === "frei" ? undefined : "frei",
          })}
          active={filters.status === "frei"}
        />
        <FilterPill
          label="Voll"
          href={href({
            status: filters.status === "voll" ? undefined : "voll",
          })}
          active={filters.status === "voll"}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
          Zeitraum
        </span>
        <FilterPill
          label="Alle"
          href={href({ zeitraum: undefined })}
          active={!filters.zeitraum}
        />
        <FilterPill
          label="Bevorstehend"
          href={href({
            zeitraum:
              filters.zeitraum === "bevorstehend" ? undefined : "bevorstehend",
          })}
          active={filters.zeitraum === "bevorstehend"}
        />
        <FilterPill
          label="Abgelaufen"
          href={href({
            zeitraum:
              filters.zeitraum === "abgelaufen" ? undefined : "abgelaufen",
          })}
          active={filters.zeitraum === "abgelaufen"}
        />
      </div>
    </div>
  );
}
