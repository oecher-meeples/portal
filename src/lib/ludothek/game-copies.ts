"use server";

import { revalidatePath } from "next/cache";
import { GameInventoryStatus, type RuleBookLanguage } from "@prisma/client";
import { findActionActor } from "@/lib/auth/action-guards";
import { prisma } from "@/lib/utils/prisma";
import { ensureMeeple } from "@/lib/members/meeples";
import { ensureUnsortiertUnit } from "@/lib/ludothek/holdings";
import { toSparePartListingData } from "@/lib/inventory/spare-part-listings";
import { uniqueSlug } from "@/lib/utils/slug";
import {
  resolveEditionId,
  type EditionSelection,
} from "@/lib/ludothek/taxonomy/versions";
import {
  resolveCopyPlacement,
  resolveOwnVereinsmitgliedIdForPlacement,
  type CopyPlacementInput,
} from "@/lib/ludothek/game-copy-placement";
import { validateInventoryNumber } from "@/lib/ludothek/game-copy-inventory-number";
import {
  validateAcquiredOn,
  validateValueCents,
} from "@/lib/ludothek/game-copy-acquisition";

import type { DbClient } from "@/lib/utils/prisma";

type Tx = DbClient;

export type { CopyPlacementInput };

export type GameCopyInput = {
  condition?: string | null;
  /** Edition (BGG-Version) dieses Exemplars — `undefined` lässt sie beim
   * Bearbeiten unverändert, `null` entfernt sie. */
  edition?: EditionSelection | null;
  placement?: CopyPlacementInput;
  /** Regelheft-Sprache(n) dieses Exemplars — Mehrfachauswahl (#188). */
  ruleBookLanguages?: RuleBookLanguage[];
  /** Inventarnummer (#270, ganzzahlig seit #543) — vorbelegt per
   * `getSuggestedInventoryNumber()`. `null` entfernt sie beim Bearbeiten. */
  inventoryNumber?: number | null;
  /** Wert in Cent (#615) — `undefined` lässt ihn beim Bearbeiten
   * unverändert, `null` entfernt ihn. */
  valueCents?: number | null;
  /** „Erhalten am" (#615) — `undefined` unverändert, `null` entfernt. */
  acquiredOn?: Date | null;
};

/** Sprechende Fehlermeldung für ungültigen Wert/„Erhalten am" (#615). */
function validateAcquisition(input: {
  valueCents?: number | null;
  acquiredOn?: Date | null;
}): string | null {
  return (
    validateValueCents(input.valueCents) ?? validateAcquiredOn(input.acquiredOn)
  );
}

/** Vorschlag fürs Inventarnummer-Feld beim Anlegen (#270): höchste vergebene
 * Nummer + 1. Bewusst kein Lücken-Auffüllen wie `nextUnitCode()` — die
 * Nummer setzt eine physische Nummerierung fort. */
export async function getSuggestedInventoryNumber() {
  const { _max } = await prisma.gameCopy.aggregate({
    _max: { inventoryNumber: true },
  });
  return (_max.inventoryNumber ?? 0) + 1;
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
    versionId,
    condition,
    ruleBookLanguages,
    inventoryNumber,
    valueCents,
    acquiredOn,
    actorId,
    placement,
  }: {
    boardGameId: string;
    boardGameTitle: string;
    versionId?: string | null;
    condition?: string | null;
    ruleBookLanguages?: RuleBookLanguage[];
    inventoryNumber?: number | null;
    valueCents?: number | null;
    acquiredOn?: Date | null;
    actorId: string;
    placement?: { unitId?: string; vereinsmitgliedId?: string };
  },
) {
  if (inventoryNumber != null) {
    const error = await validateInventoryNumber(tx, inventoryNumber);
    if (error) throw new Error(error);
  }
  const acquisitionError = validateAcquisition({ valueCents, acquiredOn });
  if (acquisitionError) throw new Error(acquisitionError);
  const slug = await uniqueGameCopySlug(tx, boardGameTitle);
  const created = await tx.gameCopy.create({
    data: {
      slug,
      boardGameId,
      versionId: versionId ?? null,
      condition: condition || null,
      ruleBookLanguages: ruleBookLanguages ?? [],
      inventoryNumber: inventoryNumber ?? null,
      valueCents: valueCents ?? null,
      acquiredOn: acquiredOn ?? null,
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
  const user = (await findActionActor("games:manage"))?.user;
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
    copy = await prisma.$transaction(async (tx) =>
      createGameCopyTx(tx, {
        boardGameId: title.id,
        boardGameTitle: title.title,
        versionId: await resolveEditionId(tx, title.id, input.edition),
        condition: input.condition,
        ruleBookLanguages: input.ruleBookLanguages,
        inventoryNumber: input.inventoryNumber,
        valueCents: input.valueCents,
        acquiredOn: input.acquiredOn,
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
  const user = (await findActionActor("games:manage"))?.user;
  if (!user) {
    return { error: "Keine Berechtigung." };
  }

  if (input.inventoryNumber != null) {
    const error = await validateInventoryNumber(
      prisma,
      input.inventoryNumber,
      id,
    );
    if (error) return { error };
  }
  const acquisitionError = validateAcquisition(input);
  if (acquisitionError) return { error: acquisitionError };

  const existing = await prisma.gameCopy.findUnique({
    where: { id },
    select: { boardGameId: true },
  });
  if (!existing) return { error: "Exemplar wurde nicht gefunden." };

  let copy;
  try {
    copy = await prisma.$transaction(async (tx) => {
      const versionId = await resolveEditionId(
        tx,
        existing.boardGameId,
        input.edition,
      );
      return tx.gameCopy.update({
        where: { id },
        data: {
          condition: input.condition || null,
          ...(versionId !== undefined ? { versionId } : {}),
          ...(input.ruleBookLanguages
            ? { ruleBookLanguages: input.ruleBookLanguages }
            : {}),
          ...(input.inventoryNumber !== undefined
            ? { inventoryNumber: input.inventoryNumber }
            : {}),
          ...(input.valueCents !== undefined
            ? { valueCents: input.valueCents }
            : {}),
          ...(input.acquiredOn !== undefined
            ? { acquiredOn: input.acquiredOn }
            : {}),
        },
        include: { boardGame: { select: { slug: true } } },
      });
    });
  } catch (caught) {
    return {
      error: caught instanceof Error ? caught.message : "Unbekannter Fehler.",
    };
  }

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
  const user = (await findActionActor("games:manage"))?.user;
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

/** Markiert ein Exemplar zur Kontrolle. `alreadyMarked` meldet ein schon
 * markiertes Exemplar (Scanner-Modus „Kontrolle anfordern", #563:
 * Hinweis statt Fehler). */
export async function requestCompletenessCheck(id: string) {
  const user = (await findActionActor("games:manage"))?.user;
  if (!user) {
    return { error: "Keine Berechtigung." };
  }

  const copy = await prisma.gameCopy.findUnique({
    where: { id },
    select: { needsCompletenessCheck: true },
  });
  if (copy?.needsCompletenessCheck) {
    return { success: true as const, alreadyMarked: true };
  }

  await prisma.gameCopy.update({
    where: { id },
    data: { needsCompletenessCheck: true },
  });

  revalidatePath("/ludothek");
  revalidatePath("/admin/bestand");
  return { success: true as const, alreadyMarked: false };
}

/**
 * Markiert alle Spiele, die **direkt** in einer Einheit liegen, zur Kontrolle
 * (#563, z. B. eine Kiste nach einem Event) — Spiele in Unterkisten nicht.
 * Gibt die Anzahl der Spiele zurück, die dabei markiert wurden.
 */
export async function markUnitForCompletenessCheck(unitId: string) {
  const user = (await findActionActor("games:manage"))?.user;
  if (!user) {
    return { error: "Keine Berechtigung." };
  }

  const { count } = await prisma.gameCopy.updateMany({
    where: {
      status: { not: GameInventoryStatus.DEINVENTARISED },
      needsCompletenessCheck: false,
      holdings: { some: { unitId, endedAt: null } },
    },
    data: { needsCompletenessCheck: true },
  });

  revalidatePath("/ludothek");
  revalidatePath("/admin/bestand");
  return { success: true as const, count };
}
