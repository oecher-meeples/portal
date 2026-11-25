"use client";

import { ActionButton } from "@/components/ui/action-button";
import { setWantToPlayMarkAction } from "@/components/feature/ludothek/want-to-play-actions";

/** Button in der „möchten das spielen"-Karte (#632-Folge): setzt bzw.
 * entfernt die eigene Markierung. */
export function WantToPlayButton({
  boardGameId,
  marked,
}: {
  boardGameId: string;
  marked: boolean;
}) {
  return (
    <ActionButton
      refresh
      variant={marked ? "outline" : "default"}
      size="sm"
      pendingLabel="Speichere…"
      action={() => setWantToPlayMarkAction(boardGameId, !marked)}
    >
      {marked ? "Doch nicht mehr" : "Ich will das auch spielen"}
    </ActionButton>
  );
}
