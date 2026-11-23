/**
 * Baut `prisma/seed-data/release-inventory.csv` (#603) aus dem CSV-Export
 * der Vereins-Tabelle „Inventar Spiele". Der Export selbst enthält
 * Personendaten (ausgeliehen an/am) und kommt nie ins Repo — nur das
 * Ergebnis dieses Skripts.
 *
 * Bereits eingetragene `bggId`s (von `match-release-inventory-bgg.ts` oder
 * von Hand) bleiben beim Neuaufbau erhalten.
 *
 * Aufruf:
 *   npx tsx scripts/build-release-inventory.ts "<pfad/zum/Inventar Spiele.csv>"
 */
import fs from "node:fs";
import path from "node:path";
import { parseCsvRows } from "../src/lib/utils/csv";
import {
  normalizeSheetRow,
  parseReleaseInventory,
  releaseRowKey,
  serializeReleaseInventory,
  type ReleaseInventoryRow,
} from "../prisma/seed-data/release-inventory";

const OUTPUT = path.join(
  __dirname,
  "../prisma/seed-data/release-inventory.csv",
);

/** Bemerkungen mit Personennamen o. Ä. — Nr. → Ersatztext (`null` = leeren). */
const NOTE_OVERRIDES: Record<number, string | null> = {
  54: "liegt ohne Nummer",
};

const [, , source] = process.argv;
if (!source) {
  console.error(
    'usage: npx tsx scripts/build-release-inventory.ts "<Inventar Spiele.csv>"',
  );
  process.exit(1);
}

const [, ...sheetRows] = parseCsvRows(fs.readFileSync(source, "utf-8"), ",");

const rows: ReleaseInventoryRow[] = [];
const seenNumbers = new Set<number>();
const review: string[] = [];

sheetRows.forEach((cells, index) => {
  let row: ReleaseInventoryRow | null;
  try {
    row = normalizeSheetRow(cells);
  } catch (error) {
    throw new Error(`Tabellenzeile ${index + 2}: ${(error as Error).message}`);
  }
  if (!row) return;

  const number = row.inventoryNumber;
  if (number !== null && number in NOTE_OVERRIDES) {
    row.note = NOTE_OVERRIDES[number];
  }
  if (number !== null && seenNumbers.has(number)) {
    review.push(`Nr. ${number} doppelt — "${row.title}" ohne Nr. übernommen`);
    row.inventoryNumber = null;
  } else if (number !== null) {
    seenNumbers.add(number);
  }
  if (row.title.length <= 1 || !/\p{L}/u.test(row.title)) {
    review.push(`Nr. ${number}: verdächtiger Titel "${row.title}"`);
  }
  if (!row.location) {
    review.push(
      `Nr. ${number} "${row.title}": Platz "${cells[5] ?? ""}" → Unsortiert`,
    );
  }
  rows.push(row);
});

const previousBggIds = new Map<string, number>();
if (fs.existsSync(OUTPUT)) {
  for (const row of parseReleaseInventory(fs.readFileSync(OUTPUT, "utf-8"))) {
    if (row.bggId) previousBggIds.set(releaseRowKey(row), row.bggId);
  }
}
for (const row of rows) {
  row.bggId = previousBggIds.get(releaseRowKey(row)) ?? null;
}

rows.sort(
  (a, b) =>
    (a.inventoryNumber ?? Infinity) - (b.inventoryNumber ?? Infinity) ||
    a.title.localeCompare(b.title, "de"),
);
fs.writeFileSync(OUTPUT, serializeReleaseInventory(rows));

const withCheck = rows.filter((r) => r.result).length;
console.log(
  `${rows.length} Exemplare geschrieben (${withCheck} mit Kontrolle, ${rows.filter((r) => r.bggId).length} mit bggId) → ${OUTPUT}`,
);
if (review.length > 0) {
  console.log(`\nZur Durchsicht (${review.length}):`);
  for (const line of review) console.log(`  - ${line}`);
}
