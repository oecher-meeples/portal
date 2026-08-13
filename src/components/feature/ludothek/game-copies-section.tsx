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
            </TableRow>
          </TableHeader>
          <TableBody>
            {copies.map((copy) => (
              <TableRow key={copy.id}>
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        copies.map((copy) => (
          <div
            key={copy.id}
            className="flex items-center justify-between gap-3"
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
          </div>
        ))
      )}
    </div>
  );
}
