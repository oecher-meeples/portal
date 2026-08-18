"use server";

import { prisma } from "@/lib/utils/prisma";
import { sleep } from "@/lib/utils/sleep";
import {
  searchBggGamesExact,
  type BggGameData,
  type BggSearchResult,
} from "@/lib/bgg/client";
import { previewBggImport } from "@/lib/ludothek/board-games-bgg-import";
import {
  createBoardGame,
  type CreateBoardGameInput,
} from "@/lib/ludothek/board-games";
import { requireGamesManagePermission } from "@/lib/ludothek/permissions";

/** Mind. so viel Zeit zwischen zwei BGG-Anfragen (#186) — BGGs Rate-Limit
 * skaliert nicht ungebremst auf z. B. 50 Titel, siehe `FETCH_TIMEOUT_MS` in
 * `lib/bgg/client.ts`. Konservativ etwas über der geforderten "max. 2
 * Anfragen/Sekunde" (500ms), da jeder eindeutig auflösbare Name zwei
 * aufeinanderfolgende BGG-Anfragen braucht (Suche + Detaildaten). */
const THROTTLE_MS = 600;

export type BulkImportRow =
  | { name: string; status: "imported"; bggId: number; title: string }
  | { name: string; status: "skipped-duplicate"; bggId: number; title: string }
  | { name: string; status: "needs-review"; candidates: BggSearchResult[] }
  | { name: string; status: "failed"; error: string };

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
    alternateNames: data.alternateNames,
  };
}

async function importOne(name: string): Promise<BulkImportRow> {
  await sleep(THROTTLE_MS);
  const candidates = await searchBggGamesExact(name);
  if (candidates.length !== 1) {
    return { name, status: "needs-review", candidates };
  }

  const { bggId } = candidates[0];
  const existing = await prisma.boardGame.findUnique({
    where: { bggId },
    select: { title: true },
  });
  if (existing) {
    return {
      name,
      status: "skipped-duplicate",
      bggId,
      title: existing.title,
    };
  }

  await sleep(THROTTLE_MS);
  const preview = await previewBggImport(bggId);
  if (!preview.success) {
    return { name, status: "failed", error: preview.error };
  }

  const created = await createBoardGame(toCreateInput(bggId, preview.data));
  if (created.error) {
    return { name, status: "failed", error: created.error };
  }

  return { name, status: "imported", bggId, title: preview.data.title };
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

  const trimmedNames = names.map((name) => name.trim()).filter(Boolean);

  const results: BulkImportRow[] = [];
  for (const name of trimmedNames) {
    results.push(await importOne(name));
  }

  return { success: true, results };
}
