"use client";

import { useState } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeading } from "@/components/ui/page-heading";
import { useCodeScanner } from "@/components/feature/scan/use-code-scanner";
import {
  getGuestGameDetail,
  lookupGuestGame,
  type GuestGameDetail,
  type GuestGameMatch,
} from "@/components/feature/guest-area/actions";
import { FreeGamesList, type FreeGameEntry } from "@/components/feature/guest-area/free-games-list";
import type { GuestFleaMarketItem } from "@/lib/events/guest-area";
import { FLEA_MARKET_ITEM_STATUS_LABELS } from "@/lib/format";

const EXPLAINER_LEVEL_LABELS: Record<string, string> = {
  WITH_MANUAL: "Mit Anleitung",
  WITHOUT_MANUAL: "Ohne Anleitung",
  BY_HEART: "Im Schlaf",
};

const STATUS_LABELS: Record<string, string> = {
  idle: "",
  starting: "Kamera wird gestartet …",
  scanning: "Bereit — Code in den Rahmen halten",
  "no-camera-access": "Kein Kamerazugriff — bitte manuell eingeben",
  "no-code-detected": "Kein Code erkannt — weiter versuchen",
};

type ViewState =
  | { kind: "idle" }
  | { kind: "unknown" }
  | { kind: "select"; games: GuestGameMatch[] }
  | { kind: "detail"; detail: GuestGameDetail };

export function GuestAreaView({
  eventId,
  eventTitle,
  freeGames,
  fleaMarketItems,
}: {
  eventId: string;
  eventTitle: string;
  freeGames: FreeGameEntry[];
  fleaMarketItems: GuestFleaMarketItem[];
}) {
  const [state, setState] = useState<ViewState>({ kind: "idle" });
  const [manualInput, setManualInput] = useState("");

  async function handleCode(raw: string) {
    const result = await lookupGuestGame(raw);
    if (result.kind === "unknown") {
      setState({ kind: "unknown" });
      return;
    }
    if (result.games.length === 1) {
      await selectGame(result.games[0].id);
      return;
    }
    setState({ kind: "select", games: result.games });
  }

  async function selectGame(boardGameId: string) {
    const detail = await getGuestGameDetail(eventId, boardGameId);
    if (!detail) {
      setState({ kind: "unknown" });
      return;
    }
    setState({ kind: "detail", detail });
  }

  const { videoRef, status, start, stop } = useCodeScanner({
    onDetected: (text) => {
      stop();
      handleCode(text);
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Gäste-Bereich"
        title={eventTitle}
        description="Scanne den Barcode einer Spielebox oder gib ihn manuell ein."
      />

      <div className="bg-card flex flex-col gap-3 rounded-lg border p-5">
        <video ref={videoRef} className="aspect-video w-full rounded-md bg-black" muted />
        <p className="text-muted-foreground text-sm">{STATUS_LABELS[status]}</p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="gap-1.5" onClick={start}>
            <Camera className="size-4" />
            Kamera starten
          </Button>
          <Input
            value={manualInput}
            onChange={(event) => setManualInput(event.target.value)}
            placeholder="EAN manuell eingeben"
          />
          <Button
            type="button"
            onClick={() => manualInput.trim() && handleCode(manualInput.trim())}
          >
            Suchen
          </Button>
        </div>
      </div>

      {state.kind === "unknown" && (
        <p className="text-destructive text-sm">
          Kein Spiel mit diesem Code gefunden.
        </p>
      )}

      {state.kind === "select" && (
        <div className="bg-card flex flex-col gap-2 rounded-lg border p-4">
          <p className="text-sm font-medium">Mehrere Treffer — bitte auswählen:</p>
          {state.games.map((game) => (
            <Button
              key={game.id}
              variant="outline"
              className="justify-start"
              onClick={() => selectGame(game.id)}
            >
              {game.title}
            </Button>
          ))}
        </div>
      )}

      {state.kind === "detail" && (
        <div className="bg-card flex flex-col gap-3 rounded-lg border p-5">
          <h2 className="font-serif text-xl font-bold">{state.detail.title}</h2>
          {state.detail.description && (
            <p className="text-muted-foreground text-sm">{state.detail.description}</p>
          )}
          <p className="text-sm">
            {state.detail.isInRoom ? "Aktuell im Raum" : "Nicht im Raum"}
          </p>
          {state.detail.explainerVideoUrl && (
            <a
              href={state.detail.explainerVideoUrl}
              target="_blank"
              rel="noreferrer"
              className="text-primary text-sm hover:underline"
            >
              Erklärvideo ansehen →
            </a>
          )}
          {state.detail.attendingExplainers.length > 0 && (
            <div>
              <p className="text-sm font-medium">Anwesende Erklärbären</p>
              <ul className="text-muted-foreground text-sm">
                {state.detail.attendingExplainers.map((explainer) => (
                  <li key={explainer.meepleId}>
                    {explainer.displayName} ·{" "}
                    {EXPLAINER_LEVEL_LABELS[explainer.level] ?? explainer.level}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <FreeGamesList games={freeGames} />

      {fleaMarketItems.length > 0 && (
        <div className="bg-card flex flex-col gap-3 rounded-lg border p-5">
          <h2 className="font-serif text-lg font-bold">Bring &amp; Buy Flohmarkt</h2>
          <ul className="flex flex-col divide-y text-sm">
            {fleaMarketItems.map((item) => (
              <li key={item.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">{item.title}</p>
                  {item.description && (
                    <p className="text-muted-foreground text-xs">{item.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span>{item.priceEuros} €</span>
                  <span className="text-muted-foreground text-xs">
                    {FLEA_MARKET_ITEM_STATUS_LABELS[item.status]}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
