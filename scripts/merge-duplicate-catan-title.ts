/**
 * One-off fix for a seed bug (#183 follow-up): `demo-games.ts` listed "Catan"
 * twice, and `seedDemoGames()` only deduped against titles already in the DB,
 * not against duplicates within the same `DEMO_GAMES` run — so two separate
 * "Catan" `BoardGame` rows were created. Merges the duplicate (no `bggId`)
 * into the canonical one (real BGG identity, `bggId` 13): moves its copies,
 * expansion assignments and Erklärbär entry over, then deletes it.
 *
 * Safe to re-run: exits early once the duplicate is gone.
 */
import { prisma } from "../src/lib/utils/prisma";

const CANONICAL_BGG_ID = 13; // Catan's real BoardGameGeek id.

async function main() {
  const titles = await prisma.boardGame.findMany({
    where: { title: "Catan" },
  });

  if (titles.length <= 1) {
    console.log("Kein Duplikat mehr vorhanden — nichts zu tun.");
    return;
  }
  if (titles.length > 2) {
    throw new Error(
      `Erwarte genau 2 "Catan"-Titel, gefunden: ${titles.length}. Bitte manuell prüfen.`,
    );
  }

  const canonical = titles.find((t) => t.bggId === CANONICAL_BGG_ID);
  const duplicate = titles.find((t) => t.id !== canonical?.id);
  if (!canonical || !duplicate) {
    throw new Error(
      `Konnte den kanonischen Titel (bggId ${CANONICAL_BGG_ID}) nicht eindeutig bestimmen.`,
    );
  }

  await prisma.$transaction([
    prisma.gameCopy.updateMany({
      where: { boardGameId: duplicate.id },
      data: { boardGameId: canonical.id },
    }),
    prisma.gameCollection.updateMany({
      where: { baseGameId: duplicate.id },
      data: { baseGameId: canonical.id },
    }),
    prisma.gameCollection.updateMany({
      where: { expansionId: duplicate.id },
      data: { expansionId: canonical.id },
    }),
    prisma.explainerGame.updateMany({
      where: { boardGameId: duplicate.id },
      data: { boardGameId: canonical.id },
    }),
    prisma.privateGameCollectionEntry.updateMany({
      where: { boardGameId: duplicate.id },
      data: { boardGameId: canonical.id },
    }),
    prisma.sparePartListing.updateMany({
      where: { boardGameId: duplicate.id },
      data: { boardGameId: canonical.id },
    }),
    prisma.boardGame.delete({ where: { id: duplicate.id } }),
  ]);

  console.log(
    `Titel "${duplicate.slug}" (${duplicate.id}) in "${canonical.slug}" (${canonical.id}) zusammengeführt und gelöscht.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
