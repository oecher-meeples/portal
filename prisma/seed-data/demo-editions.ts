import { HoldingOrigin } from "@prisma/client";
import { prisma } from "../../src/lib/utils/prisma";
import { slugify } from "../../src/lib/utils/slug";
import { upsertBoardGameVersion } from "../../src/lib/ludothek/taxonomy/versions";
import type { DemoGame } from "./demo-games";

/** Legt die deutsche Version der Demo-Exemplare an, mit dem Demo-Verlag aus
 * den Mitwirkenden (falls vorhanden). Idempotent: `upsertBoardGameVersion`
 * findet eine gleiche Version (Sprache + Verlage) wieder. */
export async function seedDemoEdition(boardGameId: string, game: DemoGame) {
  return upsertBoardGameVersion(prisma, boardGameId, {
    languages: ["German"],
    publishers: game.contributors.filter((c) => c.role === "PUBLISHER"),
  });
}

/** Nachzug für Demo-Titel aus früheren Seed-Läufen (vor den Versionen):
 * deutsche Version anlegen und den Exemplaren ohne Version zuordnen. Gibt die
 * Zahl der zugeordneten Exemplare zurück. */
export async function backfillDemoEdition(
  boardGameId: string,
  game: DemoGame,
): Promise<number> {
  const edition = await seedDemoEdition(boardGameId, game);
  const { count } = await prisma.gameCopy.updateMany({
    where: { boardGameId, versionId: null },
    data: { versionId: edition.id },
  });
  return count;
}

/** Ein Demo-Exemplar samt Anfangs-Standort, in der Demo-Version. */
export async function createDemoGameCopy(
  boardGameId: string,
  title: string,
  unitId: string,
  adminMeepleId: string,
  usedSlugs: Set<string>,
  versionId: string,
) {
  const base = slugify(title);
  let slug = base;
  let suffix = 2;
  while (usedSlugs.has(slug)) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  usedSlugs.add(slug);

  const copy = await prisma.gameCopy.create({
    data: { slug, boardGameId, versionId },
  });

  await prisma.gameHolding.create({
    data: {
      gameCopyId: copy.id,
      unitId,
      origin: HoldingOrigin.INITIAL,
      confirmedAt: new Date(),
      recordedByMeepleId: adminMeepleId,
    },
  });

  return copy;
}
