"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/status-pill";
import { useAction } from "@/components/ui/use-action";
import { MemberCombobox } from "@/components/entities/member-combobox";
import {
  HoldingTargetPicker,
  meepleTargets,
  unitTargets,
  type HoldingTarget,
  type TargetPickSource,
} from "@/components/widgets/game-holding/holding-target-picker";
import {
  confirmHoldingForGamesManager,
  scanAcceptHandover,
  scanAcceptReturn,
  scanBorrowGame,
  scanConfirmHolding,
  scanGetGameContext,
  scanGiveToMeeple,
  scanListMeeples,
  scanListUnits,
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
import { scanTransferGame } from "@/lib/ludothek/scanner-actions";

/** Ziel-Picker mit Scan (#573): Person bzw. Einheit. */
type TargetPickerFor = "handover" | "return-to-person" | "unit" | null;
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
  const [targetPicker, setTargetPicker] = useState<TargetPickerFor>(null);
  const [meeples, setMeeples] = useState<HoldingTarget[]>([]);
  const [units, setUnits] = useState<HoldingTarget[]>([]);
  const [memberPicker, setMemberPicker] = useState<MemberPickerFor>(null);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [externalNameOpen, setExternalNameOpen] = useState(false);
  const [externalName, setExternalName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const { run, pending, error } = useAction({ refresh: false });

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

  function closePickers() {
    setTargetPicker(null);
    setMemberPicker(null);
    setExternalNameOpen(false);
  }

  async function openTargetPicker(target: Exclude<TargetPickerFor, null>) {
    closePickers();
    setTargetPicker(target);
    if (target === "unit") {
      if (units.length === 0) setUnits(unitTargets(await scanListUnits()));
    } else if (meeples.length === 0) {
      setMeeples(meepleTargets(await scanListMeeples()));
    }
  }

  async function openMemberPicker(target: MemberPickerFor) {
    closePickers();
    setMemberPicker(target);
    if (members.length === 0) setMembers(await scanListMembers());
  }

  async function perform(action: () => Promise<{ error?: string }>) {
    closePickers();
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

  async function placeInUnit(unitId: string) {
    const code = units.find((unit) => unit.id === unitId)?.matchValue;
    let alreadyThere = false;
    await perform(async () => {
      const result = await scanTransferGame(gameCopyId, {
        kind: "unit",
        unitId,
      });
      alreadyThere = result.value?.outcome === "already-there";
      return result;
    });
    // Keine überflüssige Umlagerung (#537) — nur ein Hinweis.
    if (alreadyThere) setMessage(`Liegt schon in ${code}.`);
  }

  /** Jede Wahl löst sofort aus (#573): ohne Bestätigung, korrigiert wird per
   * Gegenbuchung. Ein Meeple-QR bestätigt die Übergabe direkt (#465). */
  function handleTargetPicked(id: string, source: TargetPickSource) {
    if (targetPicker === "unit") return placeInUnit(id);
    const viaMeepleQrScan = source === "meeple-qr";
    return perform(() =>
      targetPicker === "handover"
        ? scanGiveToMeeple(gameCopyId, id, viaMeepleQrScan)
        : scanReturnToMeeple(gameCopyId, id, viaMeepleQrScan),
    );
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
              onClick={() => openTargetPicker("handover")}
            >
              Weitergeben
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => openTargetPicker("return-to-person")}
            >
              An Person zurückgeben
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => {
                closePickers();
                setExternalNameOpen(true);
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

        {(holding?.unitId || holding?.vereinsmitgliedId) && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => openTargetPicker("unit")}
          >
            {holding?.unitId ? "Umlagern" : "Einlagern"}
          </Button>
        )}
      </div>

      {externalNameOpen && (
        <PickerBox
          title="Name der externen Person"
          onCancel={() => setExternalNameOpen(false)}
        >
          {/* Bewusst ohne Scan: externe Personen haben keinen QR-Code. */}
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!externalName.trim()) return;
              void perform(() => scanHandOverToExternal(game.id, externalName));
            }}
          >
            <Input
              value={externalName}
              onChange={(event) => setExternalName(event.target.value)}
              placeholder="Vor- und Nachname"
            />
            <Button
              type="submit"
              size="sm"
              disabled={pending || !externalName.trim()}
            >
              Weitergeben
            </Button>
          </form>
        </PickerBox>
      )}

      {targetPicker && (
        <PickerBox
          title={TARGET_PICKER_TITLES[targetPicker](Boolean(holding?.unitId))}
          onCancel={() => setTargetPicker(null)}
        >
          <HoldingTargetPicker
            key={targetPicker}
            targets={targetPicker === "unit" ? units : meeples}
            value={null}
            placeholder={
              targetPicker === "unit"
                ? "Einheit suchen oder scannen …"
                : "Person suchen oder scannen …"
            }
            onPick={(id, source) => {
              if (id) void handleTargetPicked(id, source);
            }}
          />
        </PickerBox>
      )}

      {memberPicker && (
        <PickerBox
          title="Vereinsmitglied auswählen"
          onCancel={() => setMemberPicker(null)}
        >
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
        </PickerBox>
      )}
    </div>
  );
}

const TARGET_PICKER_TITLES: Record<
  Exclude<TargetPickerFor, null>,
  (inUnit: boolean) => string
> = {
  handover: () => "Weitergeben an",
  "return-to-person": () => "Zurückgeben an",
  unit: (inUnit) => (inUnit ? "Umlagern nach" : "Einlagern in"),
};

/** Aufgeklappte Zielwahl unter den Aktions-Buttons. */
function PickerBox({
  title,
  onCancel,
  children,
}: {
  title: string;
  onCancel: () => void;
  children: ReactNode;
}) {
  return (
    <div className="bg-muted/40 flex flex-col gap-2 rounded-md border p-3">
      <p className="text-sm font-medium">{title}</p>
      {children}
      <Button size="sm" variant="outline" className="w-fit" onClick={onCancel}>
        Abbrechen
      </Button>
    </div>
  );
}
