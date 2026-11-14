import { HoldingOrigin } from "@prisma/client";
import { prisma } from "../../src/lib/utils/prisma";
import { slugify } from "../../src/lib/utils/slug";
import { upsertBoardGameVersion } from "../../src/lib/ludothek/taxonomy/versions";
import type { DemoGame } from "./demo-games";

function demoPublishers(game: DemoGame) {
  return game.contributors.filter((c) => c.role === "PUBLISHER");
}

/** Legt die Version der Demo-Exemplare an: die BGG-Version aus
 * `game.version` mit den Demo-Verlagen — ohne passende BGG-Version eine
 * deutsche nur mit den Verlagen. Idempotent: `upsertBoardGameVersion` findet
 * sie per BGG-Version-ID bzw. Sprache + Verlage wieder. */
export async function seedDemoEdition(boardGameId: string, game: DemoGame) {
  return upsertBoardGameVersion(prisma, boardGameId, {
    bggVersionId: game.version?.bggVersionId ?? null,
    name: game.version?.name ?? null,
    yearPublished: game.version?.yearPublished ?? null,
    productCode: game.version?.productCode ?? null,
    languages: game.version?.languages ?? ["German"],
    publishers: demoPublishers(game),
  });
}

/**
 * Frühere Seed-Läufe legten die Demo-Version ohne BGG-Bezug an (nur Deutsch +
 * Verlage, bei Titeln ohne Demo-Verlag ganz ohne). Kennt der Demo-Titel inzwischen seine BGG-Version, bekommt diese
 * alte Version die BGG-Version-ID. Gibt es die BGG-Version schon (z. B. im
 * Exemplar-Dialog von BGG gewählt), wandern Exemplare und
 * Privatsammlungs-Einträge dorthin und die alte Version entfällt.
 */
async function adoptLegacyDemoVersion(boardGameId: string, game: DemoGame) {
  const bggVersionId = game.version?.bggVersionId;
  if (bggVersionId == null) return;

  const publisherIds = demoPublishers(game).map((p) => p.bggId);
  const candidates = await prisma.boardGameVersion.findMany({
    where: { boardGameId, bggVersionId: null, name: null },
    select: {
      id: true,
      languages: true,
      publishers: { select: { contributor: { select: { bggId: true } } } },
    },
  });
  const legacy = candidates.find(
    (v) =>
      v.languages.length === 1 &&
      v.languages[0] === "German" &&
      (v.publishers.length === 0 ||
        (v.publishers.length === publisherIds.length &&
          v.publishers.every((p) =>
            publisherIds.includes(p.contributor.bggId),
          ))),
  );
  if (!legacy) return;

  const target = await prisma.boardGameVersion.findUnique({
    where: { boardGameId_bggVersionId: { boardGameId, bggVersionId } },
    select: { id: true },
  });
  if (!target) {
    await prisma.boardGameVersion.update({
      where: { id: legacy.id },
      data: { bggVersionId },
    });
    return;
  }
  await prisma.$transaction([
    prisma.gameCopy.updateMany({
      where: { versionId: legacy.id },
      data: { versionId: target.id },
    }),
    prisma.privateGameCollectionEntry.updateMany({
      where: { versionId: legacy.id },
      data: { versionId: target.id },
    }),
    prisma.boardGameVersion.delete({ where: { id: legacy.id } }),
  ]);
}

/** Nachzug für Demo-Titel aus früheren Seed-Läufen: Version auf den Stand von
 * `game.version` bringen und den Exemplaren ohne Version zuordnen. Gibt die
 * Zahl der neu zugeordneten Exemplare zurück. */
export async function backfillDemoEdition(
  boardGameId: string,
  game: DemoGame,
): Promise<number> {
  await adoptLegacyDemoVersion(boardGameId, game);
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
