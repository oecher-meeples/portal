import { useEffect, useState } from "react";
import { useDebouncedValue } from "@/components/ui/use-debounced-value";
import {
  findDuplicateBoardGame,
  getBoardGameTitleForEdit,
  type DuplicateBoardGameMatch,
} from "@/lib/ludothek/board-games";
import { parseBggId } from "@/lib/ludothek/bgg-id";

/**
 * Kapselt die Duplikat-Erkennung des Anlegen-Wizards (#183): laufende
 * (debounced) Prüfung in Schritt 2, plus die beiden Auswege — "Weiteres
 * Exemplar anlegen" (Eingabe verwerfen) und "Titel laden" (echte
 * Bestandsdaten übernehmen, Korrekturen bleiben möglich). Ausgelagert aus
 * `CreateBoardGameDialog`, da die Datei sonst die 400-Zeilen-Grenze reißt.
 */
export function useBoardGameDuplicateGuard({
  step,
  title,
  bggIdText,
}: {
  step: number;
  title: string;
  bggIdText: string;
}) {
  const [duplicate, setDuplicate] = useState<DuplicateBoardGameMatch | null>(
    null,
  );
  const [existingBoardGame, setExistingBoardGame] =
    useState<DuplicateBoardGameMatch | null>(null);
  const [isLoadingTitle, setIsLoadingTitle] = useState(false);
  // true nur nach "Titel laden" — die echten Bestandsdaten stehen im
  // Formular und sollen beim Absenden aktualisiert werden, statt verworfen
  // zu werden. "Weiteres Exemplar anlegen" setzt das nie.
  const [correctingExistingTitle, setCorrectingExistingTitle] = useState(false);

  /** Läuft bei jedem BGG-Import-Treffer und laufend in Schritt 2 (debounced). */
  async function checkDuplicate(checkedTitle: string, bggId: number | null) {
    const trimmedTitle = checkedTitle.trim();
    if (!trimmedTitle) {
      setDuplicate(null);
      return;
    }
    const match = await findDuplicateBoardGame(trimmedTitle, bggId);
    setDuplicate(match);
  }

  // Prüft laufend während Schritt 2 (debounced), ob der manuell eingegebene
  // Titel bereits existiert — Grundlage für den Hard-Block in Schritt 2.
  const debouncedTitle = useDebouncedValue(title);
  const debouncedBggIdText = useDebouncedValue(bggIdText);
  useEffect(() => {
    if (step !== 2) return;
    // Async server lookup reacting to a debounced value settling — the same
    // shape as the Ludothek-Suche's own debounce effect, just with a state
    // update instead of a router.replace.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkDuplicate(debouncedTitle, parseBggId(debouncedBggIdText));
  }, [step, debouncedTitle, debouncedBggIdText]);

  // Sobald der Titel schon per "Titel laden" übernommen wurde, matcht die
  // laufende Prüfung erwartungsgemäß wieder auf sich selbst — das ist dann
  // keine neue Warnung mehr, sondern der gewollte Bearbeitungsstand.
  const activeDuplicate =
    duplicate && duplicate.id !== existingBoardGame?.id ? duplicate : null;

  function reset() {
    setDuplicate(null);
    setExistingBoardGame(null);
    setCorrectingExistingTitle(false);
  }

  /** Merkt den Treffer als Ziel für "Weiteres Exemplar anlegen" vor — Aufrufer
   * wechselt danach zu Schritt 3. `null`, wenn (noch) kein Treffer vorliegt. */
  function selectExistingCopyTarget(): DuplicateBoardGameMatch | null {
    if (!activeDuplicate) return null;
    setExistingBoardGame(activeDuplicate);
    setCorrectingExistingTitle(false);
    return activeDuplicate;
  }

  /** Lädt die vollen Titel-Felder des Treffers — Aufrufer übernimmt sie ins
   * Formular. `null` bei fehlendem Treffer oder falls der Titel inzwischen
   * gelöscht wurde. */
  async function loadExistingTitleRecord() {
    if (!activeDuplicate) return null;

    setIsLoadingTitle(true);
    try {
      const record = await getBoardGameTitleForEdit(activeDuplicate.id);
      if (record) {
        setExistingBoardGame(activeDuplicate);
        setCorrectingExistingTitle(true);
      }
      return record;
    } finally {
      setIsLoadingTitle(false);
    }
  }

  return {
    activeDuplicate,
    existingBoardGame,
    correctingExistingTitle,
    isLoadingTitle,
    checkDuplicate,
    reset,
    selectExistingCopyTarget,
    loadExistingTitleRecord,
  };
}
