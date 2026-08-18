"use client";

import { Button } from "@/components/ui/button";

/**
 * Kistenwechsel-Rückfrage im Serienmodus "Einlagern" (#5): beim Scannen einer
 * anderen Kiste während des Serienmodus wird gefragt, ob das zuletzt
 * gescannte Spiel auf die neue Kiste umgebucht werden soll.
 */
export function RelocateConfirmPanel({
  game,
  fromUnitCode,
  toUnitCode,
  onConfirm,
}: {
  game: { title: string };
  fromUnitCode: string;
  toUnitCode: string;
  onConfirm: (relocate: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">
        Letztes Spiel <strong>{game.title}</strong> neu zuordnen zu Kiste{" "}
        <strong>{toUnitCode}</strong>?
      </p>
      <p className="text-muted-foreground text-sm">
        Bisher in <span className="font-mono">{fromUnitCode}</span>.
      </p>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onConfirm(true)}>
          Ja, umbuchen
        </Button>
        <Button size="sm" variant="outline" onClick={() => onConfirm(false)}>
          Nein
        </Button>
      </div>
    </div>
  );
}
