import { extractPostImageIds } from "@/lib/content/post-images";
import { deleteBlobs } from "@/lib/utils/blob-delete";
import { prisma } from "@/lib/utils/prisma";

/** Gleicht die Bilder eines Beitrags mit seinem Body ab (#671): im Body
 * referenzierte, noch unverknüpfte Bilder werden zugeordnet (Bilder anderer
 * Beiträge bleiben unberührt), verknüpfte aber nicht mehr referenzierte
 * werden samt Datei gelöscht. */
export async function syncPostImages(postId: string, body: string) {
  const ids = extractPostImageIds(body);

  if (ids.length > 0) {
    await prisma.postImage.updateMany({
      where: { id: { in: ids }, postId: null },
      data: { postId },
    });
  }

  const removed = await prisma.postImage.findMany({
    where: { postId, id: { notIn: ids } },
    select: { id: true, key: true },
  });
  if (removed.length === 0) return;

  await prisma.postImage.deleteMany({
    where: { id: { in: removed.map((image) => image.id) } },
  });
  await deleteBlobs(removed.map((image) => image.key));
}

/** Löscht einen Beitrag und alle Bilddateien (die DB-Zeilen fallen per
 * Cascade mit). */
export async function deletePostWithImages(postId: string) {
  const images = await prisma.postImage.findMany({
    where: { postId },
    select: { key: true },
  });
  await prisma.post.delete({ where: { id: postId } });
  await deleteBlobs(images.map((image) => image.key));
}
