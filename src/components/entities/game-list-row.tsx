"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { PublicLudothekGame, LudothekGame } from "@/lib/ludothek/browser";
import { GameCoverMedia } from "@/components/entities/game-cover-media";
import { GameZustandPill } from "@/components/entities/game-zustand-pill";
import { RibbonCorner } from "@/components/ui/ribbon-corner";
import { PackagePlus } from "lucide-react";
import { playersAndDuration } from "@/lib/ludothek/format";
import type { GameZustand } from "@/lib/ludothek/holdings";
import { cn } from "@/lib/utils/cn";

/**
 * List-view row for `/ludothek` (see Plan-Schritt 8/9): hovering (mouse) or a
 * first tap (touch) expands the description in an absolute-positioned overlay
 * — no reflow of neighbouring rows.
 */
export function GameListRow({
  game,
}: {
  game: PublicLudothekGame | (LudothekGame & { zustand: GameZustand });
}) {
  const [expanded, setExpanded] = useState(false);
  const zustand = "zustand" in game ? game.zustand : undefined;
  const isExpansion = game.kind === "BOARDGAME_EXPANSION";
  const lastPointerTypeRef = useRef<string | null>(null);

  return (
    <Link
      href={`/ludothek/${game.boardGameSlug}`}
      className={cn(
        "group bg-card hover:border-primary/60 relative flex items-center gap-4 border p-4 transition-colors",
        expanded && game.description ? "rounded-t-lg" : "rounded-lg",
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
      <div className="relative size-24 shrink-0 overflow-hidden rounded-md">
        <GameCoverMedia
          imageUrl={game.imageUrl}
          title={game.title}
          aspect="aspect-square"
        />
        {isExpansion && (
          <RibbonCorner size="sm">
            <PackagePlus className="size-2.5" />
          </RibbonCorner>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="group-hover:text-primary truncate font-serif text-base leading-snug font-semibold">
          {game.title}
        </h3>
        <p className="text-muted-foreground text-sm">
          {playersAndDuration(game)}
        </p>
        {game.description && (
          <p className="text-muted-foreground line-clamp-2 text-sm">
            {game.description}
          </p>
        )}
      </div>
      {zustand && <GameZustandPill zustand={zustand} className="shrink-0" />}

      {expanded && game.description && (
        <div
          className={cn(
            "bg-card border-primary/60 absolute inset-x-0 top-full z-10 -mt-px rounded-b-lg border border-t-0 p-4 shadow-lg",
          )}
        >
          <p className="text-muted-foreground text-sm">{game.description}</p>
        </div>
      )}
    </Link>
  );
}
