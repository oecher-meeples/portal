import { deleteBlobs } from "@/lib/utils/blob-delete";
import { prisma } from "@/lib/utils/prisma";

const ORPHAN_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Löscht Beitragsbilder, die hochgeladen, aber binnen 24 h in keinem
 * Beitrag gelandet sind (#671) — DB-Eintrag und Datei. Gibt die Anzahl
 * zurück. */
export async function deleteOrphanedPostImages(now = new Date()) {
  const cutoff = new Date(now.getTime() - ORPHAN_MAX_AGE_MS);
  const orphans = await prisma.postImage.findMany({
    where: { postId: null, createdAt: { lt: cutoff } },
    select: { id: true, key: true },
  });
  if (orphans.length === 0) return 0;

  await prisma.postImage.deleteMany({
    where: { id: { in: orphans.map((image) => image.id) } },
  });
  await deleteBlobs(orphans.map((image) => image.key));
  return orphans.length;
}
