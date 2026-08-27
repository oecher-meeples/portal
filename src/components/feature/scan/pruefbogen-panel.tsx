"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  confirmGameCondition,
  GAME_ISSUE_LABELS,
  reportGameDefect,
  type GameIssueKind,
} from "@/components/feature/scan/inventory-actions";

const ISSUE_KINDS = Object.keys(GAME_ISSUE_LABELS) as GameIssueKind[];

export function PruefbogenPanel({
  gameCopyId,
  title,
  inventoryNumber,
  onDone,
}: {
  gameCopyId: string;
  title: string;
  /** Freie Inventarnummer des Exemplars (#270). */
  inventoryNumber?: string | null;
  onDone: () => void;
}) {
  const [mode, setMode] = useState<"idle" | GameIssueKind>("idle");
  const [condition, setCondition] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    setBusy(true);
    setError(null);
    await confirmGameCondition(gameCopyId, condition);
    setBusy(false);
    onDone();
  }

  async function handleReportDefect(kind: GameIssueKind) {
    setBusy(true);
    setError(null);
    const result = await reportGameDefect(gameCopyId, kind, note);
    setBusy(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    onDone();
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="font-serif text-lg font-bold">{title}</p>
      <p className="text-muted-foreground text-sm">
        Prüfbogen{inventoryNumber ? ` · Inv.-Nr. ${inventoryNumber}` : ""}
      </p>

      {mode === "idle" && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="condition">
              Zustand (optional)
            </label>
            <Input
              id="condition"
              value={condition}
              onChange={(event) => setCondition(event.target.value)}
              placeholder="z. B. gut, leichte Gebrauchsspuren"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busy} onClick={handleConfirm}>
              Vollständig — bestätigen
            </Button>
            {ISSUE_KINDS.map((kind) => (
              <Button
                key={kind}
                size="sm"
                variant="outline"
                className="border-destructive/40 text-destructive hover:bg-destructive/10"
                disabled={busy}
                onClick={() => setMode(kind)}
              >
                {GAME_ISSUE_LABELS[kind]}
              </Button>
            ))}
          </div>
        </div>
      )}

      {mode !== "idle" && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="defect-note">
              {GAME_ISSUE_LABELS[mode]} — was ist los?
            </label>
            <Textarea
              id="defect-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              required
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
              disabled={busy || !note.trim()}
              onClick={() => handleReportDefect(mode)}
            >
              Speichern (→ Wartung)
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => setMode("idle")}
            >
              Abbrechen
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
