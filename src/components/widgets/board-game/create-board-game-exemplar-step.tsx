import { EditBoardGameExemplar } from "@/components/widgets/board-game/edit-board-game-exemplar";
import {
  CreateBoardGameLocationField,
  type LocationPlacement,
} from "@/components/widgets/board-game/create-board-game-location-field";
import type { BoardGameFormValues } from "@/components/widgets/board-game/board-game-form-values";
import type { DuplicateBoardGameMatch } from "@/lib/ludothek/board-games";

/** Schritt 3 des Anlegen-Wizards (#183): Mängelvermerk + Standort, plus ein
 * Hinweis, wenn die Kopie einem bereits vorhandenen Titel zugeordnet wird
 * (statt einen neuen anzulegen). */
export function CreateBoardGameExemplarStep({
  values,
  onChange,
  onPlacementResolved,
  placement,
  existingBoardGame,
  correctingExistingTitle,
}: {
  values: BoardGameFormValues;
  onChange: (patch: Partial<BoardGameFormValues>) => void;
  onPlacementResolved: (placement: LocationPlacement | null) => void;
  placement: LocationPlacement | null;
  existingBoardGame: DuplicateBoardGameMatch | null;
  correctingExistingTitle: boolean;
}) {
  return (
    <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto pr-1">
      {existingBoardGame && (
        <p className="text-sm">
          {correctingExistingTitle
            ? `Titel „${existingBoardGame.title}“ wird mit den Korrekturen aktualisiert, dazu ein weiteres Exemplar angelegt.`
            : `Weiteres Exemplar von „${existingBoardGame.title}“ — es wird kein neuer Titel angelegt.`}
        </p>
      )}
      <EditBoardGameExemplar
        idPrefix="game"
        values={values}
        onChange={onChange}
      />
      <CreateBoardGameLocationField onResolved={onPlacementResolved} />
      {!placement && (
        <p className="text-muted-foreground text-xs">
          Ohne Standort-Angabe liegt das Spiel zunächst in „Unsortiert“.
        </p>
      )}
    </div>
  );
}
