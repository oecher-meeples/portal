"use client";

import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import type { PublicLudothekGame, LudothekGame } from "@/lib/ludothek/browser";
import { GameCoverMedia } from "@/components/entities/game-cover-media";
import { GameZustandPill } from "@/components/entities/game-zustand-pill";
import { LanguageIndependentPill } from "@/components/entities/language-independent-pill";
import { CopyCountSuffix } from "@/components/entities/copy-count-suffix";
import { RibbonCorner } from "@/components/ui/ribbon-corner";
import { StopRowNavigation } from "@/components/ui/stop-row-navigation";
import { playersAndDuration } from "@/lib/ludothek/format";
import type { GameZustand } from "@/lib/ludothek/holdings";
import { cn } from "@/lib/utils/cn";
import { truncateText } from "@/lib/utils/truncate";

/** Collapsed description length — full text only shows on hover/tap. */
const DESCRIPTION_PREVIEW_LENGTH = 200;

/**
 * List-view row for `/ludothek` (see Plan-Schritt 8/9): the description stays
 * at its original spot under the title, capped to a short preview until
 * hovering (mouse) or a first tap (touch) reveals it in full and additionally
 * expands mechanics, weight and the Erklärbären count in an
 * absolute-positioned overlay below (#143) — no reflow of neighbouring rows.
 */
export function GameListRow({
  game,
  actions,
}: {
  game: (PublicLudothekGame | (LudothekGame & { zustand: GameZustand })) & {
    /** Set once several copies of this title are folded into one row (#121/#122). */
    copyCount?: number;
    /** How many copies share the shown zustand (#125) — only meaningful with copyCount. */
    zustandCount?: number;
  };
  /** Caller-supplied admin controls (edit/actions menu) — GameListRow just places them (#121/#122). */
  actions?: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const zustand = "zustand" in game ? game.zustand : undefined;
  const isExpansion = game.kind === "BOARDGAME_EXPANSION";
  const lastPointerTypeRef = useRef<string | null>(null);
  const hasOverlayContent = Boolean(
    game.mechanics.length > 0 || game.weight || game.explainerCount > 0,
  );

  return (
    <Link
      href={`/ludothek/${game.boardGameSlug}`}
      className={cn(
        "group bg-card hover:border-primary/60 relative flex items-center gap-5 border p-5 transition-colors",
        expanded && hasOverlayContent ? "rounded-t-lg" : "rounded-lg",
      )}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      onPointerDown={(event) => {
        lastPointerTypeRef.current = event.pointerType;
      }}
      onClick={(event) => {
        if (lastPointerTypeRef.current !== "touch") return;
        if (!expanded) {
          event.preventDefault();
          setExpanded(true);
        }
      }}
    >
      <div className="relative aspect-[3/4] w-32 shrink-0 overflow-hidden rounded-md">
        <GameCoverMedia
          imageUrl={game.imageUrl}
          title={game.title}
          aspect="aspect-[3/4]"
        />
        {isExpansion && <RibbonCorner size="sm">Erweiterung</RibbonCorner>}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h3 className="group-hover:text-primary truncate font-serif text-lg leading-snug font-semibold">
          {game.title}
          <CopyCountSuffix copyCount={game.copyCount} />
        </h3>
        <p className="text-muted-foreground text-sm">
          {playersAndDuration(game)}
        </p>
        {game.publisher.length > 0 && (
          <p className="text-muted-foreground text-sm">
            {game.publisher.join(", ")}
          </p>
        )}
        {game.description && (
          <p className="text-muted-foreground text-sm">
            {expanded
              ? game.description
              : truncateText(game.description, DESCRIPTION_PREVIEW_LENGTH)}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        {zustand && (
          <GameZustandPill
            zustand={zustand}
            count={game.zustandCount}
            total={game.copyCount}
          />
        )}
        <LanguageIndependentPill languageDependence={game.languageDependence} />
      </div>

      {actions && (
        <StopRowNavigation className="flex shrink-0 items-center gap-1">
          {actions}
        </StopRowNavigation>
      )}

      {expanded && hasOverlayContent && (
        <div
          className={cn(
            "bg-card border-primary/60 absolute inset-x-0 top-full z-10 -mt-px flex flex-col gap-2 rounded-b-lg border border-t-0 p-4 shadow-lg",
          )}
        >
          {(game.mechanics.length > 0 || game.weight) && (
            <div className="flex flex-wrap items-center gap-2">
              {game.mechanics.map((mechanic) => (
                <span
                  key={mechanic}
                  className="bg-muted rounded-full px-2 py-0.5 text-xs font-medium"
                >
                  {mechanic}
                </span>
              ))}
              {game.weight && (
                <span className="text-muted-foreground text-xs">
                  Gewichtung {game.weight.toFixed(1)}/5
                </span>
              )}
            </div>
          )}
          {game.explainerCount > 0 && (
            <p className="text-muted-foreground text-xs">
              {game.explainerCount}{" "}
              {game.explainerCount === 1 ? "Erklärbär" : "Erklärbären"}
            </p>
          )}
        </div>
      )}
    </Link>
  );
}
