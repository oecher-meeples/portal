"use server";

import { prisma } from "@/lib/utils/prisma";
import { sleep } from "@/lib/utils/sleep";
import { isValidEan, normaliseEan } from "@/lib/inventory/ean";
import {
  fetchBggGame,
  searchBggGamesExact,
  type BggGameData,
  type BggSearchResult,
} from "@/lib/bgg/client";
import { lookupEanTitle, UpcLookupError } from "@/lib/upc-lookup/client";
import { previewBggImport } from "@/lib/ludothek/board-games-bgg-import";
import { resolvePublisherFromVersions } from "@/lib/ludothek/board-game-versions";
import {
  createBoardGame,
  type CreateBoardGameInput,
} from "@/lib/ludothek/board-games";
import { requireGamesManagePermission } from "@/lib/ludothek/permissions";
import { dedupeBulkImportEntries } from "@/lib/ludothek/bulk-import-entries";

/** Mind. so viel Zeit zwischen zwei BGG-Anfragen (#186) — BGGs Rate-Limit
 * skaliert nicht ungebremst auf z. B. 50 Titel, siehe `FETCH_TIMEOUT_MS` in
 * `lib/bgg/client.ts`. Konservativ etwas über der geforderten "max. 2
 * Anfragen/Sekunde" (500ms), da jeder eindeutig auflösbare Name zwei
 * aufeinanderfolgende BGG-Anfragen braucht (Suche + Detaildaten). */
const THROTTLE_MS = 600;

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
    };

function toCreateInput(bggId: number, data: BggGameData): CreateBoardGameInput {
  return {
    title: data.title,
    kind: data.kind,
    bggId,
    minPlayers: data.minPlayers ?? undefined,
    maxPlayers: data.maxPlayers ?? undefined,
    playTimeMinutes: data.playTimeMinutes ?? undefined,
    weight: data.weight ?? undefined,
    imageUrl: data.imageUrl ?? undefined,
    description: data.description ?? undefined,
    mechanics: data.mechanics,
    explainerVideoUrl: data.explainerVideoUrl ?? undefined,
    languageDependence: data.languageDependence,
    author: data.author,
    yearPublished: data.yearPublished ?? undefined,
    // Ohne UI zur Konfliktauflösung übernimmt der Massenimport nur einen
    // eindeutigen Verlag — bei Abweichungen bleibt das Feld leer, korrigierbar
    // im Titel-Editor (#205).
    publisher: resolvePublisherFromVersions(data.versions).value ?? undefined,
    alternateNames: data.alternateNames,
  };
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
    };
  }

  const created = await createBoardGame(toCreateInput(bggId, preview.data));
  if (created.error) {
    return {
      name: entry,
      status: "failed",
      error: created.error,
      searchedTitle,
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

async function importOne(entry: string): Promise<BulkImportRow> {
  const resolved = await resolveEntryTitle(entry);
  if ("error" in resolved) {
    return { name: entry, status: "failed", error: resolved.error };
  }
  const name = resolved.title;
  const searchedTitle = name !== entry ? name : undefined;

  await sleep(THROTTLE_MS);
  const candidates = await searchBggGamesExact(name);
  if (candidates.length !== 1) {
    return { name: entry, status: "needs-review", candidates, searchedTitle };
  }

  await sleep(THROTTLE_MS);
  const result = await finishImport(entry, candidates[0].bggId, searchedTitle);
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
): Promise<BulkImportRow> {
  const user = await requireGamesManagePermission();
  if (!user) {
    return { name: entry, status: "failed", error: "Keine Berechtigung." };
  }

  return finishImport(entry, bggId);
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
): Promise<{ success: true; results: BulkImportRow[] } | { error: string }> {
  const user = await requireGamesManagePermission();
  if (!user) {
    return { error: "Keine Berechtigung." };
  }

  // Server-side safety net for the textarea's own dedup (#186-Folge) — a
  // manually pasted list can still contain the same title/EAN twice.
  const trimmedNames = dedupeBulkImportEntries(
    names.map((name) => name.trim()).filter(Boolean),
  );

  const results: BulkImportRow[] = [];
  for (const name of trimmedNames) {
    results.push(await importOne(name));
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
  const user = await requireGamesManagePermission();
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
