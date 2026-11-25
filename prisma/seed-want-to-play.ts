import { prisma } from "../src/lib/utils/prisma";
import { findOrCreateBoardGameTitle } from "../src/lib/ludothek/board-game-title-lookup";
import type { DEMO_PRIVATE_COLLECTION_POOL } from "./seed-data/demo-private-collection";

/** Demo-Want-to-Play (#637): ein paar Titel aus dem Pool der jeweils anderen
 * Person, damit Profilkarte und „Meeple möchten das spielen" nicht leer sind.
 * Nur Entwicklung — keine Produktionsdaten. */
export async function seedDemoWantToPlay(
  meepleId: string,
  pool: typeof DEMO_PRIVATE_COLLECTION_POOL,
) {
  for (const game of pool) {
    const title = await findOrCreateBoardGameTitle({
      title: game.title,
      bggId: game.bggId,
      imageUrl: game.imageUrl,
    });
    await prisma.gameWantToPlay.upsert({
      where: { meepleId_boardGameId: { meepleId, boardGameId: title.id } },
      update: {},
      create: { meepleId, boardGameId: title.id },
    });
  }
  console.log(`${pool.length} Want-to-Play-Einträge für Meeple ${meepleId}.`);
}
