import { prisma } from "../src/lib/utils/prisma";
import { DEMO_LFG_POSTS } from "./seed-data/demo-lfg";

/**
 * Upsertet auf die (in `demo-lfg.ts` fest vergebene) `id`, damit ein Re-Seed
 * die Demo-Gesuche nicht dupliziert — `LfgPost` hat sonst kein natürliches
 * Unique-Feld wie `slug`/`fileUrl` bei anderen Demo-Daten.
 */
export async function seedDemoLfgPosts(meepleIdByKey: Map<string, string>) {
  let created = 0;

  for (const post of DEMO_LFG_POSTS) {
    const createdByMeepleId = meepleIdByKey.get(post.createdByKey);
    if (!createdByMeepleId) {
      console.warn(
        `Überspringe LFG-Gesuch "${post.title}": Ersteller-Meeple "${post.createdByKey}" nicht gefunden.`,
      );
      continue;
    }

    const data = {
      title: post.title,
      gameTitle: post.gameTitle,
      description: post.description,
      plannedAt: post.plannedAt,
      dateNote: post.dateNote,
      location: post.location,
      maxParticipants: post.maxParticipants,
      createdByMeepleId,
      closedAt: post.closedAt,
    };

    const existing = await prisma.lfgPost.findUnique({
      where: { id: post.id },
    });
    if (existing) {
      await prisma.lfgPost.update({ where: { id: post.id }, data });
    } else {
      await prisma.lfgPost.create({ data: { id: post.id, ...data } });
      created += 1;
    }
  }

  console.log(
    `${created} Demo-LFG-Gesuche angelegt, ${DEMO_LFG_POSTS.length - created} bereits vorhanden aktualisiert.`,
  );
}
