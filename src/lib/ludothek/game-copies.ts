"use server";

import { revalidatePath } from "next/cache";
import {
  GameInventoryStatus,
  type RuleBookLanguage,
  type Prisma,
  type PrismaClient,
} from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import { ensureMeeple } from "@/lib/members/meeples";
import { ensureUnsortiertUnit } from "@/lib/ludothek/holdings";
import { requireGamesManagePermission } from "@/lib/ludothek/permissions";
import { toSparePartListingData } from "@/lib/inventory/spare-part-listings";
import { uniqueSlug } from "@/lib/utils/slug";
import {
  resolveCopyPlacement,
  resolveOwnVereinsmitgliedIdForPlacement,
  type CopyPlacementInput,
} from "@/lib/ludothek/game-copy-placement";
import {
  suggestNextInventoryNumber,
  validateInventoryNumberUniqueness,
} from "@/lib/ludothek/game-copy-inventory-number";

type Tx = PrismaClient | Prisma.TransactionClient;

export type { CopyPlacementInput };

export type GameCopyInput = {
  condition?: string | null;
  placement?: CopyPlacementInput;
  /** Regelheft-Sprache(n) dieses Exemplars — Mehrfachauswahl (#188). */
  ruleBookLanguages?: RuleBookLanguage[];
  /** Freie Inventarnummer (#270) — vorbelegt per `getSuggestedInventoryNumber()`. */
  inventoryNumber?: string | null;
};

/** Vorschlag fürs Inventarnummer-Feld beim Anlegen (#270). */
export async function getSuggestedInventoryNumber() {
  const copies = await prisma.gameCopy.findMany({
    select: { inventoryNumber: true },
  });
  return suggestNextInventoryNumber(copies.map((c) => c.inventoryNumber));
}

async function uniqueGameCopySlug(tx: Tx, title: string, excludeId?: string) {
  return uniqueSlug(
    title,
    async (slug) =>
      (await tx.gameCopy.findFirst({
        where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
        select: { id: true },
      })) !== null,
  );
}

/** Creates the copy row plus its initial holding — reused by `createBoardGame`
 * (new title + first copy, single transaction) and by `createGameCopy`
 * (further copy of an existing title). Defaults to "Unsortiert" when no
 * `placement` is given (#121/#122). */
export async function createGameCopyTx(
  tx: Tx,
  {
    boardGameId,
    boardGameTitle,
    condition,
    ruleBookLanguages,
    inventoryNumber,
    actorId,
    placement,
  }: {
    boardGameId: string;
    boardGameTitle: string;
    condition?: string | null;
    ruleBookLanguages?: RuleBookLanguage[];
    inventoryNumber?: string | null;
    actorId: string;
    placement?: { unitId?: string; vereinsmitgliedId?: string };
  },
) {
  if (inventoryNumber) {
    const error = await validateInventoryNumberUniqueness(tx, inventoryNumber);
    if (error) throw new Error(error);
  }
  const slug = await uniqueGameCopySlug(tx, boardGameTitle);
  const created = await tx.gameCopy.create({
    data: {
      slug,
      boardGameId,
      condition: condition || null,
      ruleBookLanguages: ruleBookLanguages ?? [],
      inventoryNumber: inventoryNumber?.trim() || null,
    },
  });

  const target =
    placement?.unitId || placement?.vereinsmitgliedId
      ? placement
      : { unitId: (await ensureUnsortiertUnit(tx)).id };

  await tx.gameHolding.create({
    data: {
      gameCopyId: created.id,
      unitId: target.unitId ?? null,
      vereinsmitgliedId: target.vereinsmitgliedId ?? null,
      origin: "INITIAL",
      confirmedAt: new Date(),
      recordedByMeepleId: actorId,
    },
  });

  return created;
}

/** Adds another physical copy to an existing title — the "weiteres Exemplar" flow. */
export async function createGameCopy(
  boardGameId: string,
  input: GameCopyInput = {},
) {
  const user = await requireGamesManagePermission();
  if (!user) {
    return { error: "Keine Berechtigung." };
  }

  const title = await prisma.boardGame.findUnique({
    where: { id: boardGameId },
    select: { id: true, title: true },
  });
  if (!title) {
    return { error: "Titel wurde nicht gefunden." };
  }

  const actor = await ensureMeeple(user);

  const resolvedOwn = await resolveOwnVereinsmitgliedIdForPlacement(
    input.placement,
    actor.id,
  );
  if ("error" in resolvedOwn) return { error: resolvedOwn.error };
  const placement = resolveCopyPlacement(
    input.placement,
    resolvedOwn.vereinsmitgliedId,
  );
  let copy;
  try {
    copy = await prisma.$transaction((tx) =>
      createGameCopyTx(tx, {
        boardGameId: title.id,
        boardGameTitle: title.title,
        condition: input.condition,
        ruleBookLanguages: input.ruleBookLanguages,
        inventoryNumber: input.inventoryNumber,
        actorId: actor.id,
        placement,
      }),
    );
  } catch (caught) {
    return {
      error: caught instanceof Error ? caught.message : "Unbekannter Fehler.",
    };
  }

  revalidatePath("/ludothek");
  revalidatePath("/admin/bestand");
  return { success: true as const, id: copy.id };
}

export async function updateGameCopy(id: string, input: GameCopyInput) {
  const user = await requireGamesManagePermission();
  if (!user) {
    return { error: "Keine Berechtigung." };
  }

  if (input.inventoryNumber) {
    const error = await validateInventoryNumberUniqueness(
      prisma,
      input.inventoryNumber,
      id,
    );
    if (error) return { error };
  }

  const copy = await prisma.gameCopy.update({
    where: { id },
    data: {
      condition: input.condition || null,
      ...(input.ruleBookLanguages
        ? { ruleBookLanguages: input.ruleBookLanguages }
        : {}),
      ...(input.inventoryNumber !== undefined
        ? { inventoryNumber: input.inventoryNumber?.trim() || null }
        : {}),
    },
    include: { boardGame: { select: { slug: true } } },
  });

  revalidatePath("/ludothek");
  revalidatePath(`/ludothek/${copy.boardGame.slug}`);
  revalidatePath("/admin/bestand");
  return { success: true as const };
}

export async function deinventoriseGameCopy(
  id: string,
  reason: string,
  addToSpareParts = false,
) {
  const user = await requireGamesManagePermission();
  if (!user) {
    return { error: "Keine Berechtigung." };
  }

  if (!reason.trim()) {
    return { error: "Bitte einen Grund für die Deinventarisierung angeben." };
  }

  const actor = addToSpareParts ? await ensureMeeple(user) : null;

  const copy = await prisma.$transaction(async (tx) => {
    const updated = await tx.gameCopy.update({
      where: { id },
      data: {
        status: GameInventoryStatus.DEINVENTARISED,
        archivedAt: new Date(),
        archivedReason: reason.trim(),
      },
      include: {
        boardGame: { select: { id: true, title: true, slug: true } },
      },
    });

    if (actor) {
      await tx.sparePartListing.create({
        data: toSparePartListingData({
          title: updated.boardGame.title,
          boardGameId: updated.boardGame.id,
          condition: updated.condition || reason.trim(),
          keeperMeepleId: actor.id,
        }),
      });
    }

    return updated;
  });

  revalidatePath("/ludothek");
  revalidatePath(`/ludothek/${copy.boardGame.slug}`);
  revalidatePath("/admin/bestand");
  return { success: true as const };
}

export async function requestCompletenessCheck(id: string) {
  const user = await requireGamesManagePermission();
  if (!user) {
    return { error: "Keine Berechtigung." };
  }

  await prisma.gameCopy.update({
    where: { id },
    data: { needsCompletenessCheck: true },
  });

  revalidatePath("/ludothek");
  revalidatePath("/admin/bestand");
  return { success: true as const };
}
