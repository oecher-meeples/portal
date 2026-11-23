import type { DuplicateBoardGameMatch } from "@/lib/ludothek/board-games";

/**
 * Warnt im Anlegen-Dialog, wenn Titel/BGG-ID schon im Bestand existieren —
 * rein informativ. Die Aktion selbst ("Weiteres Exemplar anlegen") ersetzt
 * im Footer den "Weiter"-Button, statt hier ein zweites Mal zu stehen (#183).
 */
export function BoardGameDuplicateWarning({
  duplicate,
}: {
  duplicate: DuplicateBoardGameMatch;
}) {
  return (
    <p className="rounded-md border border-amber-600/40 bg-amber-600/10 p-3 text-sm">
      „{duplicate.title}“ existiert bereits im Bestand — „Weiteres Exemplar
      anlegen“ legt keinen zweiten Titel an, sondern eine weitere Kopie dieses
      Titels. Deine aktuelle Eingabe zu Titel-Details wird dabei verworfen.
    </p>
  );
}
