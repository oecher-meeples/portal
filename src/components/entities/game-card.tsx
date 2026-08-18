import Link from "next/link";
import type { ReactNode } from "react";
import { Layers } from "lucide-react";
import type { PublicLudothekGame, LudothekGame } from "@/lib/ludothek/browser";
import { GameCoverMedia } from "@/components/entities/game-cover-media";
import { GameZustandPill } from "@/components/entities/game-zustand-pill";
import { LanguageIndependentPill } from "@/components/entities/language-independent-pill";
import { CopyCountSuffix } from "@/components/entities/copy-count-suffix";
import { CardCornerOverlay } from "@/components/ui/card-corner-overlay";
import { RibbonCorner } from "@/components/ui/ribbon-corner";
import { BggRatingBadge } from "@/components/entities/bgg-rating-badge";
import { playersAndDuration } from "@/lib/ludothek/format";
import type { GameZustand } from "@/lib/ludothek/holdings";

export function GameCard({
  game,
  actions,
}: {
  game: (PublicLudothekGame | (LudothekGame & { zustand: GameZustand })) & {
    /** Set once several copies of this title are folded into one card (#121/#122). */
    copyCount?: number;
    /** How many copies share the shown zustand (#125) — only meaningful with copyCount. */
    zustandCount?: number;
  };
  /** Caller-supplied overlay, e.g. an edit button — GameCard just places it. */
  actions?: ReactNode;
}) {
  const zustand = "zustand" in game ? game.zustand : undefined;
  const isExpansion = game.kind === "BOARDGAME_EXPANSION";
  const expansionCount = game.expansions.length;

  return (
    <Link
      href={`/ludothek/${game.boardGameSlug}`}
      className="group bg-card hover:border-primary/60 relative flex flex-col overflow-hidden rounded-lg border transition-colors"
    >
      <CardCornerOverlay corner="top-right">
        <div className="flex flex-col items-end gap-1.5">
          {actions}
          <BggRatingBadge averageRating={game.averageRating} />
        </div>
      </CardCornerOverlay>
      {isExpansion && <RibbonCorner>Erweiterung</RibbonCorner>}
      <GameCoverMedia
        imageUrl={game.imageUrl}
        title={game.title}
        aspect="aspect-video"
      />
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="group-hover:text-primary font-serif text-lg leading-snug font-semibold">
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
        {expansionCount > 0 && (
          <p className="text-muted-foreground flex items-center gap-1 text-sm">
            <Layers className="size-4" />
            {expansionCount}{" "}
            {expansionCount === 1 ? "Erweiterung" : "Erweiterungen"}
          </p>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-1.5">
          {zustand && (
            <GameZustandPill
              zustand={zustand}
              count={game.zustandCount}
              total={game.copyCount}
            />
          )}
          <LanguageIndependentPill
            languageDependence={game.languageDependence}
          />
        </div>
      </div>
    </Link>
  );
}
