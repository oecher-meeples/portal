import { escapeCsvField, parseCsvRows } from "../../src/lib/utils/csv";

/**
 * Release-Seed (#603): Regeln, mit denen eine Zeile der Vereins-Tabelle
 * „Inventar Spiele" in eine bereinigte Bestandszeile übersetzt wird, plus
 * Lesen/Schreiben der bereinigten CSV `release-inventory.csv`.
 *
 * Aus der Tabelle werden nur Nr., Titel, letzte Zählung, Zustand, Bemerkung
 * und Platz gelesen. „ausgeliehen an/am", „Letzte Rückgabe", „I" und „Wert"
 * werden verworfen — Personendaten landen nie im Repo, und für den Wert gibt
 * es kein Feld.
 */

export type ReleaseCheckResult = "COMPLETE" | "INCOMPLETE" | "UNPLAYABLE";

export interface ReleaseInventoryRow {
  /** `null` nur für die zweite Zeile einer doppelt vergebenen Nr. */
  inventoryNumber: number | null;
  title: string;
  /** Wird von `scripts/match-release-inventory-bgg.ts` vorbefüllt und von
   * Hand korrigiert — leer = Titel ohne BGG-Verknüpfung anlegen. */
  bggId: number | null;
  /** Standort-Label (`Regal A`, `Kiste 1`, `Kinder`) — `null` = Unsortiert. */
  location: string | null;
  /** Tag der letzten Zählung als `YYYY-MM-DD` — `null` = keine Kontrolle. */
  lastCheckedOn: string | null;
  /** `null` = keine Kontrolle (nicht geprüft, leer, kein Datum). */
  result: ReleaseCheckResult | null;
  /** Bemerkung ohne Mangel-Präfix — den setzt der Seed. */
  note: string | null;
  /** Regelheft ausdrücklich englisch („(EN)"/„(engl.)" im Titel). */
  englishRules: boolean;
  deinventarised: boolean;
}

/** Spalten der Vereins-Tabelle, die überhaupt gelesen werden. */
const SHEET = {
  number: 0,
  title: 1,
  lastCount: 2,
  state: 3,
  remark: 4,
  place: 5,
} as const;

const GERMAN_DATE = /^(\d{2})\.(\d{2})\.(\d{4})$/;
const ENGLISH_SUFFIX = /\s*\((?:EN|engl\.?)\)\s*$/i;
const DEINVENTARISED = /dein(?:v)?entarisiert/i;

/** `16.08.2025` → `2025-08-16`; alles andere außer leer ist ein Fehler, damit
 * kein unklares Datum still als Kontrolle durchrutscht. */
export function parseSheetDate(value: string): string | null {
  const text = value.trim();
  if (!text) return null;
  const match = GERMAN_DATE.exec(text);
  if (!match) throw new Error(`Unbekanntes Datumsformat: "${text}"`);
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

/**
 * „Platz" → Standort-Label. Ein Buchstabe ist ein Regalfach, „Kiste N" eine
 * Kiste, „Kinder" das Kinderregal. Alles andere (leer, „???", verrutschte
 * Ausleih-Einträge) → `null`, also Unsortiert.
 */
export function normalizeLocation(value: string): string | null {
  const text = value.trim();
  if (/^[A-Z]$/i.test(text)) return `Regal ${text.toUpperCase()}`;
  const box = /^kiste\s*(\d+)$/i.exec(text);
  if (box) return `Kiste ${box[1]}`;
  if (/^kinder$/i.test(text)) return "Kinder";
  return null;
}

/** Kisten sind `BOX`, Regalfächer und das Kinderregal `SHELF`. */
export function locationKind(location: string): "BOX" | "SHELF" {
  return location.startsWith("Kiste ") ? "BOX" : "SHELF";
}

function cleanRemark(value: string): string | null {
  const text = value
    .replace(DEINVENTARISED, "")
    .trim()
    .replace(/^[-–,;\s]+|[-–,;\s]+$/g, "");
  if (!text || /^vollständig$/i.test(text)) return null;
  return text;
}

/**
 * Zustand (Freitext) + Bemerkung → Kontroll-Ergebnis und Notiz.
 *
 * - „vollständig" / „vollständig?" → `COMPLETE`, außer die Bemerkung
 *   meldet etwas Fehlendes, dann `INCOMPLETE`.
 * - jede „…spielbar"-Variante („spielbar", „nur zu 5/6 spielbar", …) →
 *   `INCOMPLETE`; eine einschränkende Variante wird der Notiz vorangestellt.
 * - „unspielbar" → `UNPLAYABLE`.
 * - leer, „nicht geprüft" → keine Kontrolle.
 *
 * Unbekannte Werte werfen, statt geraten zu werden.
 */
export function classifyState(
  state: string,
  remark: string | null,
): { result: ReleaseCheckResult | null; note: string | null } {
  const text = state.trim();
  const lower = text.toLowerCase();

  if (!lower || lower.startsWith("nicht gepr")) {
    return { result: null, note: remark };
  }
  if (lower === "unspielbar") return { result: "UNPLAYABLE", note: remark };
  if (lower === "vollständig" || lower === "vollständig?") {
    const missing = remark !== null && /fehl/i.test(remark);
    return { result: missing ? "INCOMPLETE" : "COMPLETE", note: remark };
  }
  if (lower.includes("spielbar")) {
    const restriction = lower === "spielbar" ? null : text;
    const note = [restriction, remark].filter(Boolean).join(" – ") || null;
    return { result: "INCOMPLETE", note };
  }
  throw new Error(`Unbekannter Zustand: "${text}"`);
}

/**
 * Eine Tabellenzeile → bereinigte Zeile; `null` für Zeilen ohne Nr. (Leer-
 * und Summenzeilen am Tabellenende).
 *
 * Verrutschte Zeilen, in denen der Zustand in der Bemerkung-Spalte steht
 * (z. B. „City of Rome"), werden zurückgeschoben.
 */
export function normalizeSheetRow(cells: string[]): ReleaseInventoryRow | null {
  const cell = (index: number) => (cells[index] ?? "").trim();
  const rawNumber = cell(SHEET.number);
  if (!rawNumber) return null;
  if (!/^\d+$/.test(rawNumber)) {
    throw new Error(`Ungültige Nr.: "${rawNumber}"`);
  }

  let state = cell(SHEET.state);
  let remarkText = cell(SHEET.remark);
  if (!state && /^vollständig\??$/i.test(remarkText)) {
    state = remarkText;
    remarkText = "";
  }

  const rawTitle = cell(SHEET.title);
  const englishRules = ENGLISH_SUFFIX.test(rawTitle);
  const lastCheckedOn = parseSheetDate(cell(SHEET.lastCount));
  const classified = classifyState(state, cleanRemark(remarkText));

  return {
    inventoryNumber: Number(rawNumber),
    title: rawTitle.replace(ENGLISH_SUFFIX, "").trim(),
    bggId: null,
    location: normalizeLocation(cell(SHEET.place)),
    lastCheckedOn,
    // Ohne Datum keine Kontrolle — die Notiz bleibt als Zustand erhalten.
    result: lastCheckedOn ? classified.result : null,
    note: classified.note,
    englishRules,
    deinventarised: DEINVENTARISED.test(remarkText),
  };
}

/** Schlüssel, über den `bggId`-Korrekturen einen Neuaufbau der CSV
 * überleben (Nr. allein reicht wegen der doppelten Nr. nicht). */
export function releaseRowKey(
  row: Pick<ReleaseInventoryRow, "inventoryNumber" | "title">,
) {
  return `${row.inventoryNumber ?? ""}|${row.title}`;
}

const COLUMNS = [
  "inventoryNumber",
  "title",
  "bggId",
  "location",
  "lastCheckedOn",
  "result",
  "note",
  "englishRules",
  "deinventarised",
] as const;

const RESULTS = new Set<string>(["COMPLETE", "INCOMPLETE", "UNPLAYABLE"]);

export function serializeReleaseInventory(rows: ReleaseInventoryRow[]) {
  const lines = rows.map((row) =>
    [
      row.inventoryNumber ?? "",
      row.title,
      row.bggId ?? "",
      row.location ?? "",
      row.lastCheckedOn ?? "",
      row.result ?? "",
      row.note ?? "",
      row.englishRules ? "true" : "",
      row.deinventarised ? "true" : "",
    ]
      .map((value) => escapeCsvField(value, ","))
      .join(","),
  );
  return [COLUMNS.join(","), ...lines].join("\n") + "\n";
}

function optionalInt(value: string, column: string) {
  if (!value) return null;
  if (!/^\d+$/.test(value))
    throw new Error(`${column}: "${value}" ist keine Zahl`);
  return Number(value);
}

export function parseReleaseInventory(text: string): ReleaseInventoryRow[] {
  const [header, ...rows] = parseCsvRows(text.replace(/^﻿/, ""), ",");
  if (header?.join(",") !== COLUMNS.join(",")) {
    throw new Error("release-inventory.csv: unerwartete Kopfzeile.");
  }
  return rows.map((cells, index) => {
    const get = (column: (typeof COLUMNS)[number]) =>
      (cells[COLUMNS.indexOf(column)] ?? "").trim();
    const line = index + 2;
    const result = get("result");
    if (result && !RESULTS.has(result)) {
      throw new Error(`Zeile ${line}: unbekanntes Ergebnis "${result}"`);
    }
    const lastCheckedOn = get("lastCheckedOn");
    if (lastCheckedOn && !/^\d{4}-\d{2}-\d{2}$/.test(lastCheckedOn)) {
      throw new Error(
        `Zeile ${line}: Datum "${lastCheckedOn}" ist nicht YYYY-MM-DD`,
      );
    }
    if (result && !lastCheckedOn) {
      throw new Error(`Zeile ${line}: Ergebnis ohne Datum`);
    }
    const title = get("title");
    if (!title) throw new Error(`Zeile ${line}: Titel fehlt`);
    return {
      inventoryNumber: optionalInt(get("inventoryNumber"), `Zeile ${line}`),
      title,
      bggId: optionalInt(get("bggId"), `Zeile ${line}`),
      location: get("location") || null,
      lastCheckedOn: lastCheckedOn || null,
      result: (result || null) as ReleaseCheckResult | null,
      note: get("note") || null,
      englishRules: get("englishRules") === "true",
      deinventarised: get("deinventarised") === "true",
    };
  });
}
