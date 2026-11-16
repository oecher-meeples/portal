import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GameZustandPill } from "@/components/entities/game-zustand-pill";
import { LocationChainCell } from "@/components/entities/location-chain-cell";
import { AddGameCopyDialog } from "@/components/widgets/board-game/add-game-copy-dialog";
import { GameCopyQrExportButton } from "@/components/widgets/board-game/game-copy-qr-export-button";
import { GameActionsMenu } from "@/components/widgets/game-holding/game-actions-menu";
import {
  GameCopyCard,
  GameCopyTableRow,
} from "@/components/feature/ludothek/game-copy-accordion";
import type { HoldingHistoryEntry } from "@/components/feature/ludothek/game-detail-view";
import type { GameZustand } from "@/lib/ludothek/holdings";
import type { ContactDialogMeeple } from "@/lib/members/contact";
import { formatRuleBookLanguages } from "@/lib/ludothek/language-dependence";
import type { RuleBookLanguage } from "@prisma/client";

export type GameCopyRow = {
  /** GameCopy id. */
  id: string;
  zustand: GameZustand;
  /** Storage units only, outermost → innermost — the person leads separately (below). */
  unitChain: string;
  responsibleName: string | null;
  /** `null` bei keiner verantwortlichen Person — `ContactDialog` bekommt
   * dann keinen `meeple`-Prop, siehe `LocationChainCell`. */
  responsibleContactMeeple: ContactDialogMeeple | null;
  /** True, solange der aktuelle Halter die Übernahme nach einer Weitergabe
   * noch nicht bestätigt hat (`Holding.confirmedAt === null`, #456). */
  isUnconfirmed: boolean;
  condition: string | null;
  /** Sprache(n) des mitgelieferten Regelhefts, z. B. `["DE", "EN"]` (#188). */
  ruleBookLanguages: RuleBookLanguage[];
  /** Freie Inventarnummer des Exemplars (#270). */
  inventoryNumber: string | null;
  /** Edition (BGG-Version) dieses Exemplars - Vorbelegung im Exemplar-Editor. */
  versionId: string | null;
  /** Verlag(e) der Edition dieses Exemplars; leer ohne Edition. */
  publisher: string[];
  /** Whether the current session holds this copy — gates "Weitergeben" in
   * its actions menu (#128). */
  isMine: boolean;
  /** This copy's own aufenthalts-history — merged into the accordion below its row (#121/#122). */
  history: HoldingHistoryEntry[];
  /** True for a Meeple's privately imported title (#255-Folge) — no echtes
   * `GameCopy` dahinter, daher keine Aktionen (kein `GameActionsMenu`). */
  isPrivate: boolean;
};

/** This section already has exactly one copy per row/card, so `GameActionsMenu`
 * never hits its ambiguous multi-copy picker here (#128). */
function actionsMenuCopy(copy: GameCopyRow) {
  return {
    id: copy.id,
    zustand: copy.zustand,
    locationChain: copy.unitChain,
    condition: copy.condition,
    ruleBookLanguages: copy.ruleBookLanguages,
    inventoryNumber: copy.inventoryNumber,
    versionId: copy.versionId,
    isMine: copy.isMine,
  };
}

/** Ein Verlag pro Zeile — bei Co-Publishern stehen alle untereinander. */
function PublisherLines({ publisher }: { publisher: string[] }) {
  if (publisher.length === 0) return <>—</>;
  return (
    <ul className="flex flex-col">
      {publisher.map((name) => (
        <li key={name}>{name}</li>
      ))}
    </ul>
  );
}

/** Beschriftete Zelle der Ein-Zeilen-Detailansicht eines einzelnen Exemplars. */
function CopyDetail({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <div className="text-sm">{children}</div>
    </div>
  );
}

/**
 * One physical copy's zustand/standort/admin-actions — a table when the
 * title has several copies, a single card when it has exactly one (#121).
 * "+ Exemplar hinzufügen" is always available to `games:manage` holders.
 */
export function GameCopiesSection({
  copies,
  boardGameId,
  boardGameTitle,
  canManageGames,
}: {
  copies: GameCopyRow[];
  boardGameId: string;
  boardGameTitle: string;
  canManageGames: boolean;
}) {
  return (
    <div className="bg-card flex flex-col gap-3 rounded-lg border p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg font-bold">
          {copies.length > 1 ? "Exemplare" : "Exemplar"}
        </h2>
        {canManageGames && (
          <div className="flex flex-wrap gap-2">
            <GameCopyQrExportButton
              copies={copies.map((copy) => ({
                id: copy.id,
                title: boardGameTitle,
                inventoryNumber: copy.inventoryNumber,
              }))}
              zipFilename={`${boardGameTitle}-qr-codes.zip`}
            />
            <AddGameCopyDialog
              boardGameId={boardGameId}
              boardGameTitle={boardGameTitle}
            />
          </div>
        )}
      </div>

      {copies.length > 1 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Inv.-Nr.</TableHead>
              <TableHead>Zustand</TableHead>
              <TableHead>Standort/Kontakt</TableHead>
              <TableHead>Verlag</TableHead>
              <TableHead>Regelheft</TableHead>
              <TableHead className="text-right" />
              <TableHead className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {copies.map((copy) => (
              <GameCopyTableRow
                key={copy.id}
                gameCopyId={copy.id}
                history={copy.history}
                colSpan={7}
              >
                <TableCell className="text-muted-foreground text-sm">
                  {copy.inventoryNumber || "—"}
                </TableCell>
                <TableCell>
                  <GameZustandPill zustand={copy.zustand} />
                </TableCell>
                <TableCell>
                  <LocationChainCell
                    responsibleName={copy.responsibleName}
                    responsibleContactMeeple={copy.responsibleContactMeeple}
                    unitChain={copy.unitChain}
                    isUnconfirmed={copy.isUnconfirmed}
                  />
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  <PublisherLines publisher={copy.publisher} />
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatRuleBookLanguages(copy.ruleBookLanguages) || "—"}
                </TableCell>
                <TableCell className="text-right">
                  {!copy.isPrivate && (
                    <GameActionsMenu
                      copies={[actionsMenuCopy(copy)]}
                      boardGameId={boardGameId}
                      boardGameTitle={boardGameTitle}
                      canManageGames={canManageGames}
                    />
                  )}
                </TableCell>
              </GameCopyTableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        copies.map((copy) => (
          <GameCopyCard
            key={copy.id}
            gameCopyId={copy.id}
            history={copy.history}
            actions={
              !copy.isPrivate && (
                <GameActionsMenu
                  copies={[actionsMenuCopy(copy)]}
                  boardGameId={boardGameId}
                  boardGameTitle={boardGameTitle}
                  canManageGames={canManageGames}
                />
              )
            }
          >
            {/* Eine Zeile als Grid (wie die Tabellenspalten bei mehreren
                Exemplaren), auf schmalen Displays umgebrochen. */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-[auto_minmax(0,1.5fr)_1fr_auto_auto]">
              <CopyDetail label="Zustand">
                <GameZustandPill zustand={copy.zustand} className="w-fit" />
              </CopyDetail>
              <CopyDetail label="Standort/Kontakt">
                <LocationChainCell
                  responsibleName={copy.responsibleName}
                  responsibleContactMeeple={copy.responsibleContactMeeple}
                  unitChain={copy.unitChain}
                  isUnconfirmed={copy.isUnconfirmed}
                />
              </CopyDetail>
              <CopyDetail label="Verlag">
                <PublisherLines publisher={copy.publisher} />
              </CopyDetail>
              <CopyDetail label="Regelheft">
                {formatRuleBookLanguages(copy.ruleBookLanguages) || "—"}
              </CopyDetail>
              <CopyDetail label="Inv.-Nr.">
                {copy.inventoryNumber || "—"}
              </CopyDetail>
            </div>
          </GameCopyCard>
        ))
      )}
    </div>
  );
}
