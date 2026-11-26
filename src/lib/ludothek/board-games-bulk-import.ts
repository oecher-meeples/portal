"use server";

import { findActionActor } from "@/lib/auth/action-guards";
import { prisma } from "@/lib/utils/prisma";
import { sleep } from "@/lib/utils/sleep";
import { isValidEan, normaliseEan } from "@/lib/inventory/ean";
import {
  BGG_REQUEST_THROTTLE_MS as THROTTLE_MS,
  fetchBggGame,
  searchBggGamesExact,
  type BggGameData,
  type BggSearchResult,
} from "@/lib/bgg/client";
import { lookupEanTitle, UpcLookupError } from "@/lib/upc-lookup/client";
import { previewBggImport } from "@/lib/ludothek/board-games-bgg-import";
import {
  bggDataToTitleInput,
  resolvePublisherFromVersions,
} from "@/lib/ludothek/board-game-versions";
import {
  createBoardGame,
  type CreateBoardGameInput,
} from "@/lib/ludothek/board-games";
import { markTakenEans, findFreeEans } from "@/lib/ludothek/ean-candidates";
import { dedupeBulkImportEntries } from "@/lib/ludothek/bulk-import-entries";
import { getSuggestedInventoryNumber } from "@/lib/ludothek/game-copies";
import {
  INVALID_INVENTORY_NUMBER_ERROR,
  isValidInventoryNumber,
  parseInventoryNumber,
} from "@/lib/ludothek/game-copy-inventory-number";

/** The bulk-import dialog's "Trennzeichen"-Dropdown (#289) — `undefined`
 * ("Kein Trennzeichen") keeps today's behaviour, every line is a plain
 * Name/EAN. */
export type BulkImportDelimiter = ";" | "|";

export type BulkImportRow =
  | {
      name: string;
      status: "imported";
      bggId: number;
      title: string;
      /** For the "→ Ludothek"-link in the report list (#186-Folge). */
      slug: string;
    }
  | { name: string; status: "skipped-duplicate"; bggId: number; title: string }
  | {
      name: string;
      status: "needs-review";
      candidates: BggSearchResult[];
      /** Set when `name` was an EAN — the title it was resolved to before
       * the BGG search, so the admin sees what was actually looked up. */
      searchedTitle?: string;
      /** Set when the line carried an explicit Inventarnummer (#289) — kept
       * around so `resolveBulkImportCandidate()` can still apply it once the
       * admin picks the right candidate by hand. */
      inventoryNumber?: number;
    }
  | {
      name: string;
      status: "failed";
      error: string;
      searchedTitle?: string;
      /** Set when exactly one BGG title matched but the import still failed
       * afterwards (preview or create error) — the same single match as a
       * correction suggestion, so the admin doesn't have to search again. */
      candidates?: BggSearchResult[];
      inventoryNumber?: number;
    };

function toCreateInput(
  bggId: number,
  data: BggGameData,
  inventoryNumber?: number,
  eans: string[] = [],
): CreateBoardGameInput {
  return {
    ...bggDataToTitleInput(bggId, data),
    alternateNames: data.alternateNames,
    inventoryNumber,
    eans,
  };
}

/**
 * EANs für einen neu importierten Titel (#668): eine als Zeile gegebene EAN
 * zählt direkt, sonst werden alle freien EANs übernommen, die Spielemeta bzw.
 * UPCitemdb zum Titel liefern. Ein Fehlschlag lässt den Import nie scheitern.
 */
async function resolveImportEans(
  entry: string,
  data: BggGameData,
): Promise<string[]> {
  if (isValidEan(entry)) {
    const [checked] = await markTakenEans([
      { ean: normaliseEan(entry), title: data.title },
    ]);
    return checked.takenBy ? [] : [checked.ean];
  }

  return findFreeEans([data.title, ...data.alternateNames], {
    publisher: resolvePublisherFromVersions(data.versions).value ?? [],
  });
}

/**
 * Trennt eine Zeile in Inventarnummer + Name/EAN, wenn ein Trennzeichen
 * gewählt ist (#289) — die erste Spalte ist die Inventarnummer, der Rest der
 * Zeile das Spiel. Enthält die Zeile das Trennzeichen nicht (oder wäre eine
 * Seite danach leer), gilt sie unverändert als reines Name/EAN ohne
 * Inventarnummer. Eine nicht-numerische erste Spalte wird zu `NaN` (#543)
 * und als Zeilenfehler gemeldet.
 */
function splitInventoryNumber(
  line: string,
  delimiter?: BulkImportDelimiter,
): { entry: string; inventoryNumber?: number } {
  if (!delimiter) return { entry: line };

  const index = line.indexOf(delimiter);
  if (index === -1) return { entry: line };

  const inventoryNumber = parseInventoryNumber(line.slice(0, index));
  const entry = line.slice(index + delimiter.length).trim();
  if (inventoryNumber === null || !entry) return { entry: line };

  return { entry, inventoryNumber };
}

/**
 * `name` may be an EAN (from a scan or a CSV export, #186-Folge) — BGG has
 * no EAN lookup, so it's resolved to a title via UPCitemdb first and the
 * rest of the pipeline runs exactly as for a typed title. Plain titles pass
 * through unchanged.
 */
async function resolveEntryTitle(
  entry: string,
): Promise<{ title: string } | { error: string }> {
  if (!isValidEan(entry)) return { title: entry };

  try {
    const title = await lookupEanTitle(normaliseEan(entry));
    if (!title) {
      return { error: "EAN konnte keinem Titel zugeordnet werden." };
    }
    return { title };
  } catch (error) {
    if (error instanceof UpcLookupError) {
      return {
        error: "Die EAN-Suche ist aktuell nicht erreichbar.",
      };
    }
    throw error;
  }
}

/**
 * The part of the pipeline that runs once a `bggId` is settled — shared by
 * `importOne()` (an exact-search match) and `resolveBulkImportCandidate()`
 * (an admin picking one candidate off a "Nicht importiert"-row by hand,
 * #186-Folge).
 */
async function finishImport(
  entry: string,
  bggId: number,
  searchedTitle?: string,
  inventoryNumber?: number,
): Promise<BulkImportRow> {
  const existing = await prisma.boardGame.findUnique({
    where: { bggId },
    select: { title: true },
  });
  if (existing) {
    return {
      name: entry,
      status: "skipped-duplicate",
      bggId,
      title: existing.title,
    };
  }

  const preview = await previewBggImport(bggId);
  if (!preview.success) {
    return {
      name: entry,
      status: "failed",
      error: preview.error,
      searchedTitle,
      inventoryNumber,
    };
  }

  // Unbeaufsichtigter Import — es gibt niemanden, der einen Vorschlag noch
  // bestätigen könnte, deshalb wird er direkt übernommen statt nur vorbelegt
  // (#289). Sequentiell (nach Commit des vorherigen `createBoardGame()`
  // unten), damit zwei neue Exemplare im selben Batch nie denselben
  // Vorschlag bekommen.
  const resolvedInventoryNumber =
    inventoryNumber ?? (await getSuggestedInventoryNumber());

  const created = await createBoardGame(
    toCreateInput(
      bggId,
      preview.data,
      resolvedInventoryNumber,
      await resolveImportEans(entry, preview.data),
    ),
  );
  if (created.error) {
    return {
      name: entry,
      status: "failed",
      error: created.error,
      searchedTitle,
      inventoryNumber,
    };
  }

  return {
    name: entry,
    status: "imported",
    bggId,
    title: preview.data.title,
    // `createBoardGame()`'s return type is inferred (not an explicit
    // annotation), so TS doesn't narrow `boardGameSlug` to non-optional here
    // even though `created.error` above already ruled out the error branch.
    slug: created.boardGameSlug as string,
  };
}

async function importOne(
  entry: string,
  inventoryNumber?: number,
): Promise<BulkImportRow> {
  const resolved = await resolveEntryTitle(entry);
  if ("error" in resolved) {
    return { name: entry, status: "failed", error: resolved.error };
  }
  const name = resolved.title;
  const searchedTitle = name !== entry ? name : undefined;

  await sleep(THROTTLE_MS);
  const candidates = await searchBggGamesExact(name);
  if (candidates.length !== 1) {
    return {
      name: entry,
      status: "needs-review",
      candidates,
      searchedTitle,
      inventoryNumber,
    };
  }

  await sleep(THROTTLE_MS);
  const result = await finishImport(
    entry,
    candidates[0].bggId,
    searchedTitle,
    inventoryNumber,
  );
  // Keep the (single) match around as a correction suggestion if it still
  // failed afterwards — same reasoning as the needs-review candidates list.
  return result.status === "failed" ? { ...result, candidates } : result;
}

/**
 * Resolves one "Nicht importiert"-row by hand once the admin picks the
 * correct title from its candidate list (#186-Folge) — skips the search
 * step entirely since `bggId` is already known.
 */
export async function resolveBulkImportCandidate(
  entry: string,
  bggId: number,
  inventoryNumber?: number,
): Promise<BulkImportRow> {
  const user = (await findActionActor("games:manage"))?.user;
  if (!user) {
    return { name: entry, status: "failed", error: "Keine Berechtigung." };
  }

  return finishImport(entry, bggId, undefined, inventoryNumber);
}

/**
 * Massenimport mehrerer Titel per Namensliste (#186) — baut auf #183 (exakte
 * Namenssuche) auf. Sequentiell und gedrosselt statt parallel, damit BGGs
 * Rate-Limit auch bei einer langen Liste nicht überschritten wird. Ein Name
 * mit genau einem exakten Treffer wird automatisch importiert; 0 oder
 * mehrere Treffer landen unangetastet in der Review-Liste, ein bereits
 * bekannter `bggId` wird als Duplikat übersprungen statt erneut angelegt.
 */
export async function bulkImportBoardGames(
  names: string[],
  delimiter?: BulkImportDelimiter,
): Promise<{ success: true; results: BulkImportRow[] } | { error: string }> {
  const user = (await findActionActor("games:manage"))?.user;
  if (!user) {
    return { error: "Keine Berechtigung." };
  }

  // Server-side safety net for the textarea's own dedup (#186-Folge) — a
  // manually pasted list can still contain the same title/EAN twice.
  const trimmedNames = dedupeBulkImportEntries(
    names.map((name) => name.trim()).filter(Boolean),
  );

  const results: BulkImportRow[] = [];
  for (const line of trimmedNames) {
    const { entry, inventoryNumber } = splitInventoryNumber(line, delimiter);
    if (
      inventoryNumber !== undefined &&
      !isValidInventoryNumber(inventoryNumber)
    ) {
      results.push({
        name: line,
        status: "failed",
        error: INVALID_INVENTORY_NUMBER_ERROR,
      });
      continue;
    }
    results.push(await importOne(entry, inventoryNumber));
  }

  return { success: true, results };
}

export type BulkImportCandidateDetails = {
  author: string[];
  publisher: string[];
};

/**
 * Best-effort Autor/Verlag-Anreicherung für die Kandidatenliste einer
 * "Nicht importiert"-Zeile (#186-Folge) — BGGs Namenssuche liefert nur
 * ID/Titel/Jahr, Autor/Verlag stecken erst in den Detaildaten
 * (`fetchBggGame()`), eine zusätzliche Anfrage pro Kandidat. Wird erst
 * aufgerufen, nachdem die Ergebnisliste steht, nicht während der
 * eigentlichen Importschleife — beeinflusst deren Drosselung nicht. Ein
 * einzelner fehlgeschlagener Kandidat liefert leere Arrays statt den
 * gesamten Aufruf abzubrechen.
 */
export async function fetchBulkImportCandidateDetails(
  bggIds: number[],
): Promise<Record<number, BulkImportCandidateDetails>> {
  const user = (await findActionActor("games:manage"))?.user;
  if (!user) return {};

  const details: Record<number, BulkImportCandidateDetails> = {};
  for (const bggId of [...new Set(bggIds)]) {
    try {
      const data = await fetchBggGame(bggId);
      details[bggId] = {
        author: data.author,
        publisher: resolvePublisherFromVersions(data.versions).value ?? [],
      };
    } catch {
      details[bggId] = { author: [], publisher: [] };
    }
    await sleep(THROTTLE_MS);
  }

  return details;
}
