"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/status-pill";
import { useAction } from "@/components/ui/use-action";
import { MeepleCombobox } from "@/components/entities/meeple-combobox";
import { MemberCombobox } from "@/components/entities/member-combobox";
import {
  confirmHoldingForGamesManager,
  scanAcceptHandover,
  scanAcceptReturn,
  scanBorrowGame,
  scanConfirmHolding,
  scanGetGameContext,
  scanGiveToMeeple,
  scanListMeeples,
  scanPlaceGameInUnit,
  scanResolveCode,
  scanReturnToMeeple,
  type ScannedGameContext,
} from "@/lib/ludothek/holding-actions";
import {
  scanConfirmExternalReturn,
  scanHandOverToExternal,
  scanLendToExternalMember,
  scanListMembers,
  scanRebookToMember,
  type MemberOption,
} from "@/lib/ludothek/holding-actions-external";

type MeeplePickerFor = "handover" | "return-to-person" | null;
type MemberPickerFor = "lend-to-external" | "rebook" | null;

/**
 * Everything you can do with a single game you currently have in hand —
 * borrow, confirm, hand over, return, put into a storage unit. Since #333
 * also: "An extern weitergegeben"/"an extern ausgeben" (Vereinsmitglied ohne
 * Portal-Konto) und die einseitige Rückgabe-Bestätigung von extern.
 *
 * A widget, not a feature: the same use case is entered from the scan flow,
 * the ludothek detail page and the dashboard, so it belongs to none of them.
 */
export function GameHoldingPanel({
  gameCopyId,
  advanceAfterAction = false,
  canManageGames = false,
  onDone,
}: {
  gameCopyId: string;
  /** In series mode the caller moves on instead of re-showing this game. */
  advanceAfterAction?: boolean;
  /** Blendet "An extern ausgeben"/"Umbuchen" ein (`games:manage`). */
  canManageGames?: boolean;
  onDone?: () => void;
}) {
  // Keyed by gameCopyId so "still loading" is derived, never set in an effect.
  const [loaded, setLoaded] = useState<{
    id: string;
    context: ScannedGameContext | null;
  } | null>(null);
  const [meeplePicker, setMeeplePicker] = useState<MeeplePickerFor>(null);
  const [meeples, setMeeples] = useState<{ id: string; displayName: string }[]>(
    [],
  );
  const [memberPicker, setMemberPicker] = useState<MemberPickerFor>(null);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [externalNameOpen, setExternalNameOpen] = useState(false);
  const [externalName, setExternalName] = useState("");
  const [targetCodeInput, setTargetCodeInput] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const { run, pending, error, setError } = useAction({ refresh: false });

  const isCurrent = loaded?.id === gameCopyId;
  const context = isCurrent ? loaded.context : null;

  useEffect(() => {
    let cancelled = false;
    scanGetGameContext(gameCopyId).then((result) => {
      if (!cancelled) setLoaded({ id: gameCopyId, context: result });
    });
    return () => {
      cancelled = true;
    };
  }, [gameCopyId]);

  async function openMeeplePicker(target: MeeplePickerFor) {
    setMeeplePicker(target);
    setMemberPicker(null);
    if (meeples.length === 0) setMeeples(await scanListMeeples());
  }

  async function openMemberPicker(target: MemberPickerFor) {
    setMemberPicker(target);
    setMeeplePicker(null);
    if (members.length === 0) setMembers(await scanListMembers());
  }

  async function perform(action: () => Promise<{ error?: string }>) {
    setMeeplePicker(null);
    setMemberPicker(null);
    setExternalNameOpen(false);
    const ok = await run(action);
    if (!ok) return;

    setMessage("Erledigt.");
    if (advanceAfterAction) {
      onDone?.();
      return;
    }
    setLoaded({
      id: gameCopyId,
      context: await scanGetGameContext(gameCopyId),
    });
  }

  async function handlePlaceInUnit() {
    const code = targetCodeInput.trim();
    if (!code) return;

    const resolved = await scanResolveCode(code);
    if (resolved.kind !== "unit") {
      setError("Kein Einheiten-Code erkannt.");
      return;
    }
    await perform(() => scanPlaceGameInUnit(gameCopyId, resolved.unit.id));
    setTargetCodeInput("");
  }

  if (!isCurrent) {
    return <p className="text-muted-foreground text-sm">Lade …</p>;
  }
  if (!context) {
    return <p className="text-destructive text-sm">Spiel nicht gefunden.</p>;
  }

  const { game, holding, isSelf } = context;
  const isWithSelf = Boolean(holding?.vereinsmitgliedId) && isSelf;
  const isWithOther = Boolean(holding?.vereinsmitgliedId) && !isSelf;
  const isReturnFromExtern =
    isWithOther && holding?.origin === "RETURN" && !holding.verfuegbar;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <p className="font-serif text-lg font-bold">{game.title}</p>
        {holding?.confirmedAt === null && holding.vereinsmitgliedId && (
          <StatusPill label="unbestätigt" tone="warning" />
        )}
        {holding?.vereinsmitgliedId && !holding.verfuegbar && (
          <StatusPill label="nicht verfügbar" tone="neutral" />
        )}
      </div>
      {game.inventoryNumber && (
        <p className="text-muted-foreground text-sm">
          Inv.-Nr. {game.inventoryNumber}
        </p>
      )}

      {holding?.unitId && (
        <p className="text-muted-foreground text-sm">
          Liegt in {holding.unitLabel} ({holding.unitCode})
        </p>
      )}
      {holding?.vereinsmitgliedId && (
        <p className="text-muted-foreground text-sm">
          {isSelf
            ? "Liegt bei dir"
            : `Liegt bei ${holding.vereinsmitgliedName}`}
        </p>
      )}

      {error && <p className="text-destructive text-sm">{error}</p>}
      {message && !error && (
        <p className="text-sm text-emerald-600">{message}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {holding?.unitId && (
          <Button
            size="sm"
            disabled={pending}
            onClick={() => perform(() => scanBorrowGame(game.id))}
          >
            Ausleihen
          </Button>
        )}
        {holding?.unitId && canManageGames && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => openMemberPicker("lend-to-external")}
          >
            An extern ausgeben
          </Button>
        )}

        {isWithSelf && (
          <>
            {!holding?.confirmedAt && (
              <Button
                size="sm"
                disabled={pending}
                onClick={() => perform(() => scanConfirmHolding(holding!.id))}
              >
                Bestätigen
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => openMeeplePicker("handover")}
            >
              Weitergeben
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => openMeeplePicker("return-to-person")}
            >
              An Person zurückgeben
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => {
                setExternalNameOpen(true);
                setMeeplePicker(null);
                setMemberPicker(null);
              }}
            >
              An extern weitergegeben
            </Button>
          </>
        )}

        {isWithOther && (
          <>
            <Button
              size="sm"
              disabled={pending}
              onClick={() => perform(() => scanAcceptHandover(game.id))}
            >
              Ich habe es erhalten
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => perform(() => scanAcceptReturn(game.id))}
            >
              Ich nehme es zur Rückgabe an
            </Button>
          </>
        )}

        {isWithOther &&
          !holding?.confirmedAt &&
          holding?.origin !== "RETURN" &&
          canManageGames && (
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() =>
                perform(() => confirmHoldingForGamesManager(holding!.id))
              }
            >
              Für {holding?.vereinsmitgliedName} bestätigen
            </Button>
          )}

        {isReturnFromExtern && (
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              perform(() => scanConfirmExternalReturn(holding!.id))
            }
          >
            Ich habe das Spiel erhalten
          </Button>
        )}

        {holding?.vereinsmitgliedId &&
          !holding.verfuegbar &&
          canManageGames && (
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => openMemberPicker("rebook")}
            >
              Umbuchen
            </Button>
          )}
      </div>

      {externalNameOpen && (
        <div className="bg-muted/40 flex flex-col gap-2 rounded-md border p-3">
          <p className="text-sm font-medium">Name der externen Person</p>
          <Input
            value={externalName}
            onChange={(event) => setExternalName(event.target.value)}
            placeholder="Vor- und Nachname"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={pending || !externalName.trim()}
              onClick={() =>
                perform(() => scanHandOverToExternal(game.id, externalName))
              }
            >
              Weitergeben
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setExternalNameOpen(false)}
            >
              Abbrechen
            </Button>
          </div>
        </div>
      )}

      {meeplePicker && (
        <div className="bg-muted/40 flex flex-col gap-2 rounded-md border p-3">
          <p className="text-sm font-medium">Person auswählen</p>
          <MeepleCombobox
            options={meeples}
            value={null}
            onValueChange={(meepleId) => {
              if (!meepleId) return;
              perform(() =>
                meeplePicker === "handover"
                  ? scanGiveToMeeple(game.id, meepleId)
                  : scanReturnToMeeple(game.id, meepleId),
              );
            }}
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setMeeplePicker(null)}
          >
            Abbrechen
          </Button>
        </div>
      )}

      {memberPicker && (
        <div className="bg-muted/40 flex flex-col gap-2 rounded-md border p-3">
          <p className="text-sm font-medium">Vereinsmitglied auswählen</p>
          <MemberCombobox
            options={members}
            value={null}
            onValueChange={(memberId) => {
              if (!memberId) return;
              perform(() =>
                memberPicker === "lend-to-external"
                  ? scanLendToExternalMember(game.id, memberId)
                  : scanRebookToMember(game.id, memberId),
              );
            }}
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setMemberPicker(null)}
          >
            Abbrechen
          </Button>
        </div>
      )}

      {(holding?.unitId || holding?.vereinsmitgliedId) && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="holding-target-code"
              className="text-muted-foreground text-xs"
            >
              In Einheit legen (Code)
            </label>
            <Input
              id="holding-target-code"
              value={targetCodeInput}
              onChange={(event) => setTargetCodeInput(event.target.value)}
              placeholder="OM-BOX-0002"
              className="h-8 w-auto"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={pending || !targetCodeInput.trim()}
            onClick={handlePlaceInUnit}
          >
            {holding?.unitId ? "Umlagern" : "Einlagern"}
          </Button>
        </div>
      )}
    </div>
  );
}
