"use server";

import { revalidatePath } from "next/cache";
import { BoardGameKind, type RuleBookLanguage } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import { normaliseEan } from "@/lib/inventory/ean";
import { ensureMeeple } from "@/lib/members/meeples";
import { createGameCopyTx } from "@/lib/ludothek/game-copies";
import {
  resolveCopyPlacement,
  resolveOwnVereinsmitgliedIdForPlacement,
  type CopyPlacementInput,
} from "@/lib/ludothek/game-copy-placement";
import { requireGamesManagePermission } from "@/lib/ludothek/permissions";
import {
  type BoardGameTitleInput,
  findOrCreateBoardGameTitle,
  toBoardGameTitleData,
  uniqueBoardGameSlug,
  validateBoardGameTitleInput,
} from "@/lib/ludothek/board-game-title-lookup";

// `findOrCreateBoardGameTitle`/`uniqueBoardGameSlug` leben in
// `board-game-title-lookup.ts`, damit `prisma/seed.ts` (per `tsx` direkt
// ausgeführt) sie ohne den `server-only`-Guard aus `meeples.ts` importieren
// kann, den dieses Modul über `ensureMeeple` transitiv zieht (#241).
export type { BoardGameTitleInput };
export { findOrCreateBoardGameTitle, uniqueBoardGameSlug };

export type CreateBoardGameInput = BoardGameTitleInput & {
  condition?: string | null;
  /** Regelheft-Sprache(n) der ersten Kopie (#188). */
  ruleBookLanguages?: RuleBookLanguage[];
  /** Initial standort for the first copy — defaults to "Unsortiert" when
   * omitted (#121/#122). `self` places it directly with the creator. */
  placement?: CopyPlacementInput;
  /** Ungefiltert aus BGGs `name type="alternate"` (#187) — nur bei einem
   * wirklich neuen Titel angelegt, siehe `willReuseByBggId` unten. Beim
   * Anlegen eines weiteren Exemplars eines bereits bekannten `bggId`-Titels
   * würden diese sonst bei jedem Mal dupliziert. */
  alternateNames?: string[];
};

/** Duplicate EANs are allowed by design (ADR 0001) — surfaced only as a hint. */
async function duplicateEanHint(
  ean: string | null | undefined,
  excludeId?: string,
) {
  if (!ean) return undefined;

  const count = await prisma.boardGame.count({
    where: {
      ean: normaliseEan(ean),
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });

  return count > 0
    ? "Diese EAN ist bereits einem anderen Spiel zugeordnet — das ist bei mehreren Exemplaren desselben Titels normal."
    : undefined;
}

/** Every title touched by an expansion assignment, revalidated via its own route. */
async function revalidateAssignmentPaths(
  baseGameId: string,
  expansionId: string,
) {
  const games = await prisma.boardGame.findMany({
    where: { id: { in: [baseGameId, expansionId] } },
    select: { slug: true },
  });

  revalidatePath("/ludothek");
  for (const game of games) {
    revalidatePath(`/ludothek/${game.slug}`);
  }
}

/** New title + its first physical copy, in one transaction. */
export async function createBoardGame(input: CreateBoardGameInput) {
  const user = await requireGamesManagePermission();
  if (!user) {
    return { error: "Keine Berechtigung." };
  }

  const validationError = validateBoardGameTitleInput(input);
  if (validationError) {
    return { error: validationError };
  }

  // Ein bekannter bggId reusest den vorhandenen Titel ohnehin (siehe
  // `findOrCreateBoardGameTitle`) — kein Duplikat. Ohne diesen Fall würde
  // `findOrCreateBoardGameTitle` einen neuen, gleichnamigen Titel anlegen;
  // das verhindern wir hier hart, statt es nur im Dialog zu warnen (#183).
  const willReuseByBggId = input.bggId
    ? Boolean(
        await prisma.boardGame.findUnique({
          where: { bggId: input.bggId },
          select: { id: true },
        }),
      )
    : false;

  if (!willReuseByBggId) {
    const collision = await findTitleOnlyMatch(input.title);
    if (collision) {
      return {
        error: `„${collision.title}“ existiert bereits im Bestand. Bitte über „Weiteres Exemplar anlegen“ eine weitere Kopie dieses Titels anlegen, statt einen zweiten Titel mit demselben Namen zu erzeugen.`,
      };
    }
  }

  const [hint, actor] = await Promise.all([
    duplicateEanHint(input.ean),
    ensureMeeple(user),
  ]);

  const resolvedOwn = await resolveOwnVereinsmitgliedIdForPlacement(
    input.placement,
    actor.id,
  );
  if ("error" in resolvedOwn) return { error: resolvedOwn.error };
  const placement = resolveCopyPlacement(
    input.placement,
    resolvedOwn.vereinsmitgliedId,
  );

  const { copy, boardGameId, boardGameSlug } = await prisma.$transaction(
    async (tx) => {
      const title = await findOrCreateBoardGameTitle(input, tx);

      if (!willReuseByBggId && input.alternateNames?.length) {
        await tx.boardGameAlternateName.createMany({
          data: input.alternateNames.map((name) => ({
            boardGameId: title.id,
            name,
          })),
        });
      }

      const copy = await createGameCopyTx(tx, {
        boardGameId: title.id,
        boardGameTitle: title.title,
        condition: input.condition,
        ruleBookLanguages: input.ruleBookLanguages,
        actorId: actor.id,
        placement,
      });
      return { copy, boardGameId: title.id, boardGameSlug: title.slug };
    },
  );

  revalidatePath("/ludothek");
  revalidatePath("/admin/bestand");
  // `boardGameId`/`boardGameSlug` let callers auto-select or deep-link the
  // newly created title, e.g. the nested "Spiel anlegen" flow from
  // `AssignExpansionDialog`s Combobox (#204) or the Massenimport-Ergebnisliste (#186).
  return {
    success: true as const,
    id: copy.id,
    boardGameId,
    boardGameSlug,
    hint,
  };
}

export async function updateBoardGame(id: string, input: BoardGameTitleInput) {
  const user = await requireGamesManagePermission();
  if (!user) {
    return { error: "Keine Berechtigung." };
  }

  const validationError = validateBoardGameTitleInput(input);
  if (validationError) {
    return { error: validationError };
  }

  const hint = await duplicateEanHint(input.ean, id);

  const game = await prisma.boardGame.update({
    where: { id },
    data: { title: input.title, ...toBoardGameTitleData(input) },
  });

  revalidatePath("/ludothek");
  revalidatePath(`/ludothek/${game.slug}`);
  revalidatePath("/admin/bestand");
  return { success: true as const, hint };
}

/**
 * Lädt die vollen Titel-Felder eines bestehenden Titels — Grundlage für
 * „Titel laden" im Anlegen-Dialog: statt die Eingabe bei einem erkannten
 * Duplikat zu verwerfen, übernimmt der Admin die echten Bestandsdaten und
 * kann sie korrigieren (#183).
 */
export async function getBoardGameTitleForEdit(id: string) {
  const user = await requireGamesManagePermission();
  if (!user) return null;

  return prisma.boardGame.findUnique({
    where: { id },
    select: {
      title: true,
      secondaryTitle: true,
      ean: true,
      kind: true,
      languageDependence: true,
      bggId: true,
      minPlayers: true,
      maxPlayers: true,
      playTimeMinutes: true,
      weight: true,
      averageRating: true,
      imageUrl: true,
      description: true,
      mechanics: true,
      explainerVideoUrl: true,
      publisher: true,
      author: true,
      yearPublished: true,
    },
  });
}

export type DuplicateBoardGameMatch = { id: string; title: string };

/** Case-insensitive exakter Titel-Match, ohne Permission-Check — interner
 * Baustein für `findDuplicateBoardGame` (Client-Warnung) und den
 * Server-seitigen Hard-Block in `createBoardGame` (#183). */
async function findTitleOnlyMatch(
  title: string,
): Promise<DuplicateBoardGameMatch | null> {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) return null;

  return prisma.boardGame.findFirst({
    where: { title: { equals: trimmedTitle, mode: "insensitive" } },
    select: { id: true, title: true },
  });
}

/**
 * Prüft, ob dieser Titel (per `bggId` oder exaktem Titel, case-insensitive)
 * bereits im Bestand existiert — Grundlage für die "weiteres Exemplar
 * anlegen"-Warnung im Anlegen-Dialog (#183).
 */
export async function findDuplicateBoardGame(
  title: string,
  bggId?: number | null,
): Promise<DuplicateBoardGameMatch | null> {
  const user = await requireGamesManagePermission();
  if (!user) return null;

  if (bggId) {
    const byBggId = await prisma.boardGame.findUnique({
      where: { bggId },
      select: { id: true, title: true },
    });
    if (byBggId) return byBggId;
  }

  return findTitleOnlyMatch(title);
}
/** Manual base game ↔ expansion assignment, see #30 — BGG import is blocked by #12. */
export async function assignExpansion(baseGameId: string, expansionId: string) {
  const user = await requireGamesManagePermission();
  if (!user) {
    return { error: "Keine Berechtigung." };
  }

  if (baseGameId === expansionId) {
    return { error: "Ein Spiel kann nicht seine eigene Erweiterung sein." };
  }

  await prisma.gameCollection.upsert({
    where: { baseGameId_expansionId: { baseGameId, expansionId } },
    update: {},
    create: { baseGameId, expansionId },
  });

  // The assigned title is an expansion by definition — set `kind` if the
  // BGG import didn't already (no fallback on removal, see #30).
  await prisma.boardGame.updateMany({
    where: {
      id: expansionId,
      kind: { not: BoardGameKind.BOARDGAME_EXPANSION },
    },
    data: { kind: BoardGameKind.BOARDGAME_EXPANSION },
  });

  await revalidateAssignmentPaths(baseGameId, expansionId);
  return { success: true as const };
}

/**
 * Candidate titles for the assignment dialog (#30): base-game candidates
 * (`gameKind` is an expansion) must themselves be a BOARDGAME; expansion
 * candidates (game is a base game) can be any kind — BGG import is blocked
 * (#12), so `kind` isn't reliably set on every title yet.
 */
export async function findExpansionAssignmentOptions(
  gameKind: BoardGameKind,
  excludeIds: string[],
) {
  const isExpansion = gameKind === BoardGameKind.BOARDGAME_EXPANSION;

  return prisma.boardGame.findMany({
    where: {
      id: { notIn: excludeIds },
      ...(isExpansion ? { kind: BoardGameKind.BOARDGAME } : {}),
    },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });
}

export async function removeExpansionAssignment(
  baseGameId: string,
  expansionId: string,
) {
  const user = await requireGamesManagePermission();
  if (!user) {
    return { error: "Keine Berechtigung." };
  }

  await prisma.gameCollection.deleteMany({
    where: { baseGameId, expansionId },
  });

  await revalidateAssignmentPaths(baseGameId, expansionId);
  return { success: true as const };
}
