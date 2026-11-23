"use client";

import { useState } from "react";
import { SearchIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import {
  fetchExplainerVideoOptions,
  type ExplainerVideoSource,
} from "@/lib/ludothek/board-games-bgg-import";
import type { BggExplainerVideo } from "@/lib/bgg/client";

const SOURCE_DESCRIPTIONS: Record<ExplainerVideoSource, string> = {
  "bgg-german": "Deutschsprachige Regelvideos von BoardGameGeek.",
  youtube:
    "Kein deutschsprachiges Video im sichtbaren BGG-Fenster gefunden — Treffer stattdessen über eine YouTube-Suche, sortiert nach Abonnentenzahl.",
  "bgg-fallback":
    "Kein deutschsprachiges Video gefunden — englischsprachige Videos von BoardGameGeek.",
};

const subscriberFormatter = new Intl.NumberFormat("de-DE");

function formatSubscriberCount(count: number | undefined) {
  return count === undefined ? "–" : subscriberFormatter.format(count);
}

/**
 * Auswahl-Dialog für das Erklärvideo (#185-Folgeanfrage) — hinter dem
 * Lupen-Icon neben dem Videofeld. Zeigt die Treffer als Tabelle (Titel, Link,
 * Kanal, Abonnenten) statt als einfache Buttonliste, damit der Admin die
 * Kandidaten vor der Übernahme vergleichen kann. Übernahme per Doppelklick
 * auf eine Zeile oder per Auswahl + "Übernehmen"-Button — nie automatisch,
 * auch nicht bei nur einem Treffer.
 *
 * Öffnet sich meist über einem bereits offenen Titel-Dialog. Dass der
 * dahinterliegende Dialog dabei unklickbar und optisch zurückgenommen wird,
 * regelt `DialogContent` selbst über Base UIs `data-nested-dialog-open`
 * (#185-Folgeanfrage) — hier nur ein zusätzlicher Ring/Schatten, damit sich
 * dieser Dialog trotzdem sichtbar davon abhebt.
 */
export function ExplainerVideoSearchDialog({
  bggId,
  onSelect,
}: {
  bggId: number | null;
  onSelect: (url: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [videos, setVideos] = useState<BggExplainerVideo[]>([]);
  const [source, setSource] = useState<ExplainerVideoSource | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);

  async function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen || !bggId) return;

    setIsLoading(true);
    setError(null);
    setVideos([]);
    setSource(null);
    setSelectedUrl(null);
    try {
      const result = await fetchExplainerVideoOptions(bggId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      if (result.videos.length === 0) {
        setError(
          "Kein Video in den 15 aktuellsten BGG-Videos gefunden. BGG liefert je Titel nur dieses Fenster — ein älteres Video kann trotzdem existieren, bitte ggf. auf BoardGameGeek prüfen und die URL manuell eintragen.",
        );
        return;
      }
      setVideos(result.videos);
      setSource(result.source);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Das Video konnte nicht geladen werden. Bitte erneut versuchen.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleConfirm(url: string) {
    onSelect(url);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label="Erklärvideo suchen"
            disabled={!bggId}
          >
            <SearchIcon className="size-4" />
          </Button>
        }
      />
      <DialogContent className="ring-border shadow-2xl ring-2 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Erklärvideo auswählen</DialogTitle>
          {source && (
            <DialogDescription>{SOURCE_DESCRIPTIONS[source]}</DialogDescription>
          )}
        </DialogHeader>

        {isLoading && (
          <p className="text-muted-foreground text-sm">Lade Videos…</p>
        )}
        {error && <p className="text-destructive text-sm">{error}</p>}

        {videos.length > 0 && (
          <div className="max-h-96 overflow-y-auto rounded-md border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 font-medium">Titel</th>
                  <th className="px-3 py-2 font-medium">Kanal</th>
                  <th className="px-3 py-2 font-medium">Abonnenten</th>
                  <th className="px-3 py-2 font-medium">Link</th>
                </tr>
              </thead>
              <tbody>
                {videos.map((video) => (
                  <tr
                    key={video.url}
                    onClick={() => setSelectedUrl(video.url)}
                    onDoubleClick={() => handleConfirm(video.url)}
                    className={cn(
                      "hover:bg-accent hover:text-accent-foreground cursor-pointer border-t",
                      selectedUrl === video.url &&
                        "bg-accent text-accent-foreground",
                    )}
                  >
                    <td className="px-3 py-2">{video.title || "—"}</td>
                    <td className="px-3 py-2">{video.channel || "—"}</td>
                    <td className="px-3 py-2">
                      {formatSubscriberCount(video.subscriberCount)}
                    </td>
                    <td className="px-3 py-2">
                      <a
                        href={video.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        className="text-primary hover:underline"
                      >
                        Ansehen
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {source === "bgg-fallback" && videos.length > 0 && (
          <p className="text-muted-foreground text-xs">
            BGG liefert je Titel nur die 15 aktuellsten Videos, unabhängig von
            der Gesamtzahl — ein älteres deutschsprachiges Video kann deshalb
            existieren, ohne hier zu erscheinen. Bei Bedarf direkt auf
            BoardGameGeek prüfen und die URL manuell eintragen.
          </p>
        )}

        <DialogFooter>
          <Button
            type="button"
            disabled={!selectedUrl}
            onClick={() => selectedUrl && handleConfirm(selectedUrl)}
          >
            Übernehmen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
