import type { MemberImportRow } from "@/lib/members/member-import-csv";

/**
 * Vorschau- und Entscheidungstypen des Mitgliederimports (#611) — geteilt von
 * Vorschau (`member-import-preview.ts`), Familienauflösung
 * (`member-import-families.ts`) und Zuordnungsregeln
 * (`member-import-decisions.ts`).
 */

/** - `skipped`: Mitgliedsnummer existiert schon, wird nicht angefasst.
 * - `error`: harter Fehler, wird nicht importiert (`message`).
 * - `ready`: eigene, freie E-Mail — wird ohne Rückfrage angelegt.
 * - `group`: teilt die E-Mail mit anderen Zeilen und/oder einem bestehenden
 *   Mitglied (Anker) — Rolle wählen.
 * - `loginConflict`: E-Mail gehört einem Login ohne Mitglied — verknüpfen
 *   oder andere/keine E-Mail.
 * - `needsRole`: ohne E-Mail und ohne Gruppe — erwachsen oder einer Familie
 *   zuweisen. */
export type ImportRowStatus =
  "skipped" | "error" | "ready" | "group" | "loginConflict" | "needsRole";

export type ImportPreviewRow = MemberImportRow & {
  status: ImportRowStatus;
  message: string | null;
};

export type ImportAnchor = { memberId: string; name: string };

export type ImportGroup = {
  email: string;
  lines: number[];
  /** Bestehendes (Nicht-Kind-)Mitglied mit dieser Adresse — behält sie fest
   * und wird nicht verändert. */
  anchor: ImportAnchor | null;
};

/** Wem eine E-Mail im Bestand schon gehört. `login.meepleId` ist `null`, wenn
 * das Login (noch) kein Meeple hat — dann ist keine Verknüpfung möglich. */
export type ImportEmailOwner = {
  member: { id: string; isChild: boolean } | null;
  login: {
    meepleId: string | null;
    displayName: string;
    hasMember: boolean;
  } | null;
};

export type MemberImportPreview = {
  rows: ImportPreviewRow[];
  groups: ImportGroup[];
  /** Lowercased E-Mail → Besitzer, nur für tatsächlich vergebene Adressen. */
  emailOwners: Record<string, ImportEmailOwner>;
  /** Bestehende Nicht-Kind-Mitglieder als Erziehungsberechtigten-Kandidaten
   * (`id` = `member:<memberId>`). */
  existingGuardianOptions: { id: string; label: string }[];
};

/** `row:<line>` (Zeile aus der Datei) oder `member:<id>` (Bestand) — als
 * String, damit er direkt als `IdCombobox`-Option taugt. */
export type PersonRef = string;

export type RowDecision = {
  /** `null` = in der Familie noch nicht zugewiesen bzw. ohne Familie noch
   * offen. */
  role: "adult" | "child" | null;
  /** Eigene bzw. andere E-Mail eines Erwachsenen. Bei Kindern und beim
   * Hüter der gemeinsamen Adresse ignoriert. */
  email: string;
  /** „Erstmal leer lassen" — Erwachsener wird bewusst ohne E-Mail angelegt. */
  noEmail: boolean;
  /** Behält die gemeinsame Adresse der Familie (nur nötig, wenn die Familie
   * mehrere Erziehungsberechtigte hat). */
  keepsSharedEmail: boolean;
  /** Mit dem Login der E-Mail verknüpfen (Login ohne Mitglied). */
  linkMeeple: boolean;
  /** In die Familie dieser Person verschoben; `null` = Herkunftsgruppe. */
  family: PersonRef | null;
  /** „Nicht importieren" — die Zeile wird bewusst nicht angelegt. */
  skip: boolean;
};

/** Schlüssel = Zeilennummer. Nur angelegt werdende Zeilen haben einen Eintrag. */
export type ImportDecisions = Record<number, RowDecision>;

/** `familyKey` gesetzt = betrifft die ganze Familie, nicht nur die Zeile. */
export type ImportIssue = { line: number; message: string; familyKey?: string };

export const CREATABLE_STATUSES: ReadonlySet<ImportRowStatus> = new Set([
  "ready",
  "group",
  "loginConflict",
  "needsRole",
]);

/** Wird diese Zeile angelegt? Angelegt werdender Status und nicht vom
 * Admin ausgeschlossen. */
export function isImportedRow(
  row: ImportPreviewRow,
  decisions: ImportDecisions,
): boolean {
  return CREATABLE_STATUSES.has(row.status) && !decisions[row.line]?.skip;
}

export function rowRef(line: number): PersonRef {
  return `row:${line}`;
}

export function memberRef(memberId: string): PersonRef {
  return `member:${memberId}`;
}
