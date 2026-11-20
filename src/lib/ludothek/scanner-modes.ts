import type { ScannedGameCopy } from "@/lib/ludothek/holdings-lookup";
import type { ReceiveDecision } from "@/lib/ludothek/scanner-dispatch";

/**
 * Modi der Scanner-Seite `/scan` (Epic #536). Der Modus steht in der URL
 * (`?modus=<wert>`), ohne Parameter ist es der Einzel-Scan. Ein fehlender,
 * ungültiger oder nicht erlaubter Modus fällt still auf den Einzel-Scan
 * zurück — kein `localStorage`.
 */
export const SCANNER_PAGE_MODES = [
  "erhalten",
  "einzel",
  "markieren",
  "kontrollieren",
] as const;
export type ScannerPageMode = (typeof SCANNER_PAGE_MODES)[number];

export const SCANNER_PAGE_MODE_LABELS: Record<ScannerPageMode, string> = {
  erhalten: "Erhalten",
  einzel: "Einzel-Scan",
  markieren: "Zur Kontrolle markieren",
  // Früher „Prüfbogen" (#563).
  kontrollieren: "Kontrollieren",
};

const GAMES_MANAGE_ONLY: ReadonlySet<ScannerPageMode> = new Set([
  "markieren",
  "kontrollieren",
]);

const DEFAULT_MODE: ScannerPageMode = "einzel";

/** Die Modi, die diese Person wählen darf — in Anzeige-Reihenfolge. */
export function scannerModesFor(canManageGames: boolean): ScannerPageMode[] {
  return SCANNER_PAGE_MODES.filter(
    (mode) => canManageGames || !GAMES_MANAGE_ONLY.has(mode),
  );
}

/** `searchParams.modus` → erlaubter Modus, sonst still der Einzel-Scan. */
export function parseScannerMode(
  raw: string | string[] | undefined,
  canManageGames: boolean,
): ScannerPageMode {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return (
    scannerModesFor(canManageGames).find((mode) => mode === value) ??
    DEFAULT_MODE
  );
}

/** URL eines Modus — der Einzel-Scan ist `/scan` ohne Parameter. */
export function scannerModeHref(mode: ScannerPageMode): string {
  return mode === DEFAULT_MODE ? "/scan" : `/scan?modus=${mode}`;
}

/** „1 Spiel" / „N Spiele" — für die Serien-Zähler. */
export function spieleCount(count: number) {
  return `${count} ${count === 1 ? "Spiel" : "Spiele"}`;
}

/** Log-Text je Ergebnis im Modus „Erhalten". */
export const RECEIVE_OUTCOME_LABELS: Record<ReceiveDecision, string> = {
  borrow: "ausgeliehen",
  handover: "übernommen",
  "take-over-return": "als Ausleihe übernommen",
  confirm: "bestätigt",
  "already-mine": "hast du schon",
};

export type CopyChoice = {
  id: string;
  title: string;
  inventoryNumber: number | null;
  boardGameSlug: string;
  needsCompletenessCheck: boolean;
};

type ChoosableCopy = Pick<
  ScannedGameCopy,
  "id" | "condition" | "inventoryNumber" | "needsCompletenessCheck"
> & { boardGame: { title: string; slug: string } };

/** Exemplar-Auswahl bei mehrdeutiger EAN: Titel samt Zustand. */
export function toCopyChoices(games: ChoosableCopy[]): CopyChoice[] {
  return games.map((game) => ({
    id: game.id,
    title: game.condition
      ? `${game.boardGame.title} (${game.condition})`
      : game.boardGame.title,
    inventoryNumber: game.inventoryNumber,
    boardGameSlug: game.boardGame.slug,
    needsCompletenessCheck: game.needsCompletenessCheck,
  }));
}
