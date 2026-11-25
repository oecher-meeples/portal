"use client";

import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CoverMedia } from "@/components/ui/cover-media";
import { useAction } from "@/components/ui/use-action";
import { ExplainerLevelToggle } from "@/components/entities/explainer-level-toggle";
import { GameTitleLink } from "@/components/feature/erklaerbaeren/game-title-link";
import { addExplainerGame, removeExplainerGame } from "@/lib/explainer/actions";
import type { ExplainerGameRow as Row } from "@/lib/explainer/game-list";
import { cn } from "@/lib/utils/cn";

/** Eine Zeile von Tab „Meine Spiele“: Bild, Titel mit Link, Niveau-Regler und
 * Papierkorb, der nur mein Niveau entfernt (das Spiel bleibt in „Gesucht“). */
export function ExplainerGameRow({ game }: { game: Row }) {
  const { run, pending, error } = useAction();

  return (
    <li
      className={cn(
        "bg-card flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:gap-4",
        game.isExpansion && "ml-4 sm:ml-8",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <CoverMedia
          imageUrl={game.imageUrl}
          alt=""
          aspect="aspect-square"
          className="w-12 shrink-0"
          sizes="48px"
        />
        <div className="flex min-w-0 flex-col gap-1">
          <GameTitleLink title={game.boardGameTitle} bggId={game.bggId} />
          <div className="flex flex-wrap gap-1.5">
            {game.isExpansion && <Badge variant="outline">Erweiterung</Badge>}
            {game.wanted && <Badge variant="warning">Erklärer gesucht</Badge>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ExplainerLevelToggle
          value={game.level}
          disabled={pending}
          onChange={(level) =>
            run(() => addExplainerGame(game.boardGameId, level))
          }
        />
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={`${game.boardGameTitle}: mein Niveau entfernen`}
          disabled={pending || game.level === null}
          onClick={() => run(() => removeExplainerGame(game.boardGameId))}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </li>
  );
}
