import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GameZustandPill } from "@/components/entities/game-zustand-pill";
import { ContactDialog } from "@/components/entities/contact-dialog";
import { EditBoardGameExemplarDialog } from "@/components/widgets/board-game/edit-board-game-exemplar-dialog";
import { AddGameCopyDialog } from "@/components/widgets/board-game/add-game-copy-dialog";
import {
  GameCopyCard,
  GameCopyTableRow,
} from "@/components/feature/ludothek/game-copy-accordion";
import type { HoldingHistoryEntry } from "@/components/feature/ludothek/game-detail-view";
import type { GameZustand } from "@/lib/ludothek/holdings";
import type { ContactLinks } from "@/lib/members/contact";

export type GameCopyRow = {
  /** GameCopy id. */
  id: string;
  zustand: GameZustand;
  /** Storage units only, outermost → innermost — the person leads separately (below). */
  unitChain: string;
  responsibleName: string | null;
  responsibleContact: ContactLinks;
  condition: string | null;
  /** This copy's own aufenthalts-history — merged into the accordion below its row (#121/#122). */
  history: HoldingHistoryEntry[];
};

/** Person (clickable via `ContactDialog`) leads, then the storage chain —
 * the pickup orientation point comes first (#121 Standort-Kette). */
function LocationCell({ copy }: { copy: GameCopyRow }) {
  if (!copy.responsibleName && !copy.unitChain) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  return (
    <span className="text-muted-foreground text-sm">
      {copy.responsibleName && (
        <>
          bei{" "}
          <ContactDialog
            name={copy.responsibleName}
            contact={copy.responsibleContact}
          />
        </>
      )}
      {copy.responsibleName && copy.unitChain && " → "}
      {copy.unitChain}
    </span>
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
          <AddGameCopyDialog
            boardGameId={boardGameId}
            boardGameTitle={boardGameTitle}
          />
        )}
      </div>

      {copies.length > 1 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Zustand</TableHead>
              <TableHead>Standort/Kontakt</TableHead>
              {canManageGames && <TableHead className="text-right" />}
              <TableHead className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {copies.map((copy) => (
              <GameCopyTableRow
                key={copy.id}
                gameCopyId={copy.id}
                history={copy.history}
                colSpan={canManageGames ? 4 : 3}
              >
                <TableCell>
                  <GameZustandPill zustand={copy.zustand} />
                </TableCell>
                <TableCell>
                  <LocationCell copy={copy} />
                </TableCell>
                {canManageGames && (
                  <TableCell className="text-right">
                    <EditBoardGameExemplarDialog
                      copyId={copy.id}
                      condition={copy.condition}
                    />
                  </TableCell>
                )}
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
          >
            <div className="flex flex-col gap-1">
              <GameZustandPill zustand={copy.zustand} className="w-fit" />
              <LocationCell copy={copy} />
            </div>
            {canManageGames && (
              <EditBoardGameExemplarDialog
                copyId={copy.id}
                condition={copy.condition}
              />
            )}
          </GameCopyCard>
        ))
      )}
    </div>
  );
}
