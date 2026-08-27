/**
 * One-off cleanup for #262: `isYoutubeLink()` used to accept `http://` links
 * from the BGG XML feed, so some `BoardGame.explainerVideoUrl` rows may hold
 * an unvalidated `http://` YouTube link. No reliable `http` → `https`
 * auto-fix exists for arbitrary hosts, so affected rows are cleared instead.
 *
 * Safe to re-run: exits early once no `http://` link remains.
 */
import { prisma } from "../src/lib/utils/prisma";

async function main() {
  const affected = await prisma.boardGame.findMany({
    where: { explainerVideoUrl: { startsWith: "http://" } },
    select: { id: true, slug: true, explainerVideoUrl: true },
  });

  if (affected.length === 0) {
    console.log("Keine http://-Youtube-Links mehr vorhanden — nichts zu tun.");
    return;
  }

  await prisma.boardGame.updateMany({
    where: { explainerVideoUrl: { startsWith: "http://" } },
    data: { explainerVideoUrl: null },
  });

  console.log(
    `${affected.length} http://-Youtube-Link(s) auf null gesetzt: ${affected
      .map((game) => `${game.slug} (${game.explainerVideoUrl})`)
      .join(", ")}`,
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
