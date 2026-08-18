"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlternateNamesManager } from "@/components/widgets/board-game/alternate-names-manager";

/**
 * Übersicht aller Titel-Varianten (#203) — hinter dem External-Link-Icon
 * neben dem Sekundärtitel-Feld, analog `ExplainerVideoSearchDialog`. Zeigt
 * Haupttitel und Sekundärtitel nur informativ (eigene `BoardGame`-Felder,
 * hier nicht editierbar); die Alternativtitel-Verwaltung darunter bleibt die
 * bestehende `AlternateNamesManager`-Logik.
 */
export function TitleOverviewDialog({
  boardGameId,
  title,
  secondaryTitle,
}: {
  boardGameId: string;
  title: string;
  secondaryTitle: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Alle Titel anzeigen"
          >
            <ExternalLink className="size-4" />
          </Button>
        }
      />
      <DialogContent className="ring-border shadow-2xl ring-2 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Alle Titel</DialogTitle>
          <DialogDescription>
            Haupttitel, Sekundärtitel und alle Alternativtitel dieses Spiels.
          </DialogDescription>
        </DialogHeader>

        <ul className="flex flex-col gap-1.5 text-sm">
          <li className="rounded-md border p-2">
            <span className="text-muted-foreground text-xs">Haupttitel</span>
            <p>{title || "—"}</p>
          </li>
          {secondaryTitle && (
            <li className="rounded-md border p-2">
              <span className="text-muted-foreground text-xs">
                Sekundärtitel
              </span>
              <p>{secondaryTitle}</p>
            </li>
          )}
        </ul>

        <AlternateNamesManager boardGameId={boardGameId} />
      </DialogContent>
    </Dialog>
  );
}
