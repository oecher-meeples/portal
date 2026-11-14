import { EditBoardGameExemplar } from "@/components/widgets/board-game/edit-board-game-exemplar";
import { EanField } from "@/components/widgets/board-game/ean-field";
import {
  CreateBoardGameLocationField,
  type LocationPlacement,
} from "@/components/widgets/board-game/create-board-game-location-field";
import type { BoardGameFormValues } from "@/components/widgets/board-game/board-game-form-values";
import type { DuplicateBoardGameMatch } from "@/lib/ludothek/board-games";
import type { BggGameData, BggVersion } from "@/lib/bgg/client";
import { parseCommaSeparatedList } from "@/lib/ludothek/bgg-id";

/** Schritt 3 des Anlegen-Wizards (#183): alles, was zum Exemplar und seiner
 * Version gehört — Version/Edition, EAN, Mängelvermerk, Regelheft, Standort —
 * plus ein Hinweis, wenn die Kopie einem bereits vorhandenen Titel zugeordnet
 * wird (statt einen neuen anzulegen). */
export function CreateBoardGameExemplarStep({
  values,
  onChange,
  onPlacementResolved,
  placement,
  existingBoardGame,
  correctingExistingTitle,
  preview,
  onSelectVersion,
}: {
  values: BoardGameFormValues;
  onChange: (patch: Partial<BoardGameFormValues>) => void;
  onPlacementResolved: (placement: LocationPlacement | null) => void;
  placement: LocationPlacement | null;
  existingBoardGame: DuplicateBoardGameMatch | null;
  correctingExistingTitle: boolean;
  preview: BggGameData | null;
  /** Übernimmt eine BGG-Version der Vorschau ins Formular. */
  onSelectVersion: (version: BggVersion) => void;
}) {
  // Die EAN steht (noch) am Titel — beim reinen Hinzufügen eines Exemplars zu
  // einem vorhandenen Titel wird sie nicht gespeichert, also nicht anbieten.
  const showEan = !existingBoardGame || correctingExistingTitle;
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
        boardGameId={existingBoardGame?.id}
        bggVersions={preview?.versions}
        onSelectBggVersion={onSelectVersion}
      />
      {showEan && (
        <EanField
          // Neu mounten je Version: die automatische EAN-Suche läuft dann mit
          // deren Product Code und Verlag erneut, sofern das Feld leer ist.
          key={values.bggVersion?.bggVersionId ?? values.editionMode}
          idPrefix="game"
          value={values.ean}
          onChange={(ean) => onChange({ ean })}
          title={values.title}
          autoSearchOnMount
          alternateTitles={preview?.alternateNames}
          bggProductCode={values.bggVersion?.productCode ?? null}
          publisherForSorting={parseCommaSeparatedList(values.publisher)}
        />
      )}
      <CreateBoardGameLocationField onResolved={onPlacementResolved} />
      {!placement && (
        <p className="text-muted-foreground text-xs">
          Ohne Standort-Angabe liegt das Spiel zunächst in „Unsortiert“.
        </p>
      )}
    </div>
  );
}
