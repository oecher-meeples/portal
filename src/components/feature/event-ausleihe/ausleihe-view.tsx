"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CodeScanner } from "@/components/ui/code-scanner";
import {
  ausleiheGetAvailability,
  ausleiheIssueGame,
  ausleiheReturnToUnit,
  ausleiheResolveCode,
} from "@/components/feature/event-ausleihe/ausleihe-actions";
import { PageContainer } from "@/components/ui/page-container";

type ViewState =
  | { kind: "idle" }
  | { kind: "unknown"; raw: string }
  | {
      kind: "select-game";
      games: { id: string; title: string }[];
    }
  | { kind: "available"; gameCopyId: string; title: string }
  | {
      kind: "on-loan";
      gameCopyId: string;
      title: string;
      previousUnit: { id: string; code: string; label: string } | null;
    }
  | {
      kind: "returning-scan-target";
      gameCopyId: string;
      title: string;
    }
  | { kind: "unit-info"; label: string; code: string };

/**
 * Event-Ausgabe/Rückgabe-Seite (#121) — bewusst eigenständig statt der
 * Ludothek-Dropdown-Aktionen (GameHoldingPanel): kein Menü, nur der jeweils
 * eine sinnvolle nächste Schritt als Button. Nutzt dieselben, bereits
 * schlanken Domain-Funktionen (borrowGame/returnGame über ausleihe-actions.ts).
 */
export function AusleiheView() {
  const [state, setState] = useState<ViewState>({ kind: "idle" });
  const [manualInput, setManualInput] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function resolveGame(gameCopyId: string, title: string) {
    const availability = await ausleiheGetAvailability(gameCopyId);
    if (!availability) {
      setState({ kind: "idle" });
      return;
    }
    setState(
      availability.kind === "available"
        ? { kind: "available", gameCopyId, title }
        : {
            kind: "on-loan",
            gameCopyId,
            title,
            previousUnit: availability.previousUnit,
          },
    );
  }

  async function handleCode(raw: string) {
    setMessage(null);
    const resolved = await ausleiheResolveCode(raw);

    if (resolved.kind === "unknown") {
      setState({ kind: "unknown", raw });
      return;
    }

    if (resolved.kind === "unit") {
      if (state.kind === "returning-scan-target") {
        setPending(true);
        const result = await ausleiheReturnToUnit(
          state.gameCopyId,
          resolved.unit.id,
        );
        setPending(false);
        setMessage(
          result.error
            ? result.error
            : `${state.title} → zurückgestellt in ${resolved.unit.label}.`,
        );
        setState({ kind: "idle" });
        return;
      }
      setState({
        kind: "unit-info",
        label: resolved.unit.label,
        code: resolved.unit.code,
      });
      return;
    }

    if (resolved.games.length > 1) {
      setState({
        kind: "select-game",
        games: resolved.games.map((g) => ({
          id: g.id,
          title: g.boardGame.title,
        })),
      });
      return;
    }

    const game = resolved.games[0];
    await resolveGame(game.id, game.boardGame.title);
  }

  async function issue(gameCopyId: string, title: string) {
    setPending(true);
    const result = await ausleiheIssueGame(gameCopyId);
    setPending(false);
    setMessage(result.error ? result.error : `${title} ausgegeben.`);
    setState({ kind: "idle" });
  }

  async function returnToKnownLocation(
    gameCopyId: string,
    title: string,
    unit: { id: string; label: string },
  ) {
    setPending(true);
    const result = await ausleiheReturnToUnit(gameCopyId, unit.id);
    setPending(false);
    setMessage(
      result.error
        ? result.error
        : `${title} → zurückgestellt in ${unit.label}.`,
    );
    setState({ kind: "idle" });
  }

  return (
    <PageContainer className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <CodeScanner onDetected={handleCode} />

      <div className="bg-card flex flex-col gap-4 rounded-lg border p-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="manual-code" className="text-sm font-medium">
            Manuelle Eingabe
          </label>
          <div className="flex gap-2">
            <Input
              id="manual-code"
              value={manualInput}
              onChange={(event) => setManualInput(event.target.value)}
              placeholder="OM-BOX-0001 oder EAN"
            />
            <Button
              onClick={() => {
                if (manualInput.trim()) void handleCode(manualInput.trim());
              }}
            >
              Suchen
            </Button>
          </div>
        </div>

        <div className="border-t pt-4">
          {state.kind === "idle" && (
            <p className="text-muted-foreground text-sm">
              Noch nichts gescannt.
            </p>
          )}

          {state.kind === "unknown" && (
            <p className="text-sm">
              Nicht im Bestand: <span className="font-mono">{state.raw}</span>
            </p>
          )}

          {state.kind === "unit-info" && (
            <p className="text-sm">
              Das ist eine Einheit ({state.label},{" "}
              <span className="font-mono">{state.code}</span>) — kein Spiel.
              Bitte den EAN eines Spiels scannen.
            </p>
          )}

          {state.kind === "select-game" && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">
                Mehrere Exemplare — welches?
              </p>
              <div className="flex flex-col gap-1">
                {state.games.map((game) => (
                  <button
                    key={game.id}
                    type="button"
                    className="hover:bg-muted rounded-md border px-3 py-2 text-left text-sm"
                    onClick={() => void resolveGame(game.id, game.title)}
                  >
                    {game.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {state.kind === "available" && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">{state.title}</p>
              <Button
                disabled={pending}
                onClick={() => void issue(state.gameCopyId, state.title)}
              >
                Ausgeben
              </Button>
            </div>
          )}

          {state.kind === "on-loan" && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">{state.title}</p>
              <p className="text-muted-foreground text-sm">Rückgabe:</p>
              <div className="flex flex-wrap gap-2">
                {state.previousUnit && (
                  <Button
                    disabled={pending}
                    onClick={() =>
                      void returnToKnownLocation(
                        state.gameCopyId,
                        state.title,
                        state.previousUnit!,
                      )
                    }
                  >
                    Zurück an {state.previousUnit.label}
                  </Button>
                )}
                <Button
                  variant="outline"
                  disabled={pending}
                  onClick={() =>
                    setState({
                      kind: "returning-scan-target",
                      gameCopyId: state.gameCopyId,
                      title: state.title,
                    })
                  }
                >
                  Neuen Standort scannen
                </Button>
              </div>
            </div>
          )}

          {state.kind === "returning-scan-target" && (
            <p className="bg-primary/10 rounded-md p-2 text-sm">
              Scanne jetzt die Ziel-Einheit für <strong>{state.title}</strong>.{" "}
              <button
                type="button"
                className="underline"
                onClick={() => setState({ kind: "idle" })}
              >
                abbrechen
              </button>
            </p>
          )}

          {message && (
            <p className="text-muted-foreground mt-3 text-sm">{message}</p>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
