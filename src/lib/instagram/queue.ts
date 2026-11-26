import { siteUrl } from "@/lib/utils/site-url";
import {
  InstagramStatus,
  type Post,
  type PostInstagramDetails,
} from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import { decryptSecret, encryptSecret } from "@/lib/utils/crypto";
import { resolveCoverImageUrl } from "@/lib/instagram/cover-image";
import { extractPostImageIds, postImageUrl } from "@/lib/content/post-images";
import {
  createCarouselContainer,
  createCarouselItemContainer,
  createMediaContainer,
  publishMedia,
  refreshLongLivedToken,
} from "@/lib/instagram/graph-client";

const MAX_ATTEMPTS = 3;
const REFRESH_THRESHOLD_MS = 10 * 24 * 60 * 60 * 1000;
const DEFAULT_EXPIRES_IN_SECONDS = 60 * 24 * 60 * 60;

export type DuePost = Post & { instagramDetails: PostInstagramDetails };

function buildCaption(post: Pick<Post, "title" | "excerpt" | "slug">): string {
  return `${post.title}\n\n${post.excerpt}\n\nMehr dazu: ${siteUrl()}/news/${post.slug}`;
}

/** Instagram erlaubt höchstens 10 Elemente pro Karussell. */
const MAX_CAROUSEL_ITEMS = 10;

/** Bild-URLs eines Beitrags in Karussell-Reihenfolge (#671): Cover zuerst,
 * dann die Body-Bilder in Textreihenfolge. Body-Bilder kommen als JPEG
 * (`?format=jpeg`) über die öffentliche Route — Instagram akzeptiert nur
 * JPEG, und nur öffentliche Beiträge werden gepostet. */
async function collectImageUrls(
  post: Pick<Post, "id" | "body" | "coverImageUrl">,
  resolveCover: () => Promise<string>,
): Promise<string[]> {
  const ids = extractPostImageIds(post.body);
  const linked = ids.length
    ? await prisma.postImage.findMany({
        where: { id: { in: ids }, postId: post.id },
        select: { id: true },
      })
    : [];
  const linkedIds = new Set(linked.map((image) => image.id));
  const bodyUrls = ids
    .filter((id) => linkedIds.has(id))
    .map((id) => `${siteUrl()}${postImageUrl(id)}?format=jpeg`);

  if (bodyUrls.length === 0) return [await resolveCover()];
  const urls = post.coverImageUrl
    ? [await resolveCover(), ...bodyUrls]
    : bodyUrls;
  return urls.slice(0, MAX_CAROUSEL_ITEMS);
}

export function findDuePosts() {
  return prisma.post.findMany({
    where: {
      instagram: true,
      instagramDetails: {
        status: { in: [InstagramStatus.PENDING, InstagramStatus.QUEUED] },
        attempts: { lt: MAX_ATTEMPTS },
      },
    },
    include: { instagramDetails: true },
  }) as Promise<DuePost[]>;
}

export async function processPost(post: DuePost): Promise<boolean> {
  try {
    const connection = await prisma.instagramConnection.findFirst();
    if (!connection) {
      throw new Error("Keine aktive Instagram-Verbindung vorhanden.");
    }

    const imageUrls = await collectImageUrls(post, () =>
      resolveCoverImageUrl(post),
    );
    const caption = buildCaption(post);
    const accessToken = decryptSecret(connection.accessToken);
    const igBusinessAccountId = connection.igBusinessAccountId;

    let creationId: string;
    if (imageUrls.length === 1) {
      ({ creationId } = await createMediaContainer({
        igBusinessAccountId,
        imageUrl: imageUrls[0],
        caption,
        accessToken,
      }));
    } else {
      const childrenIds: string[] = [];
      for (const imageUrl of imageUrls) {
        const child = await createCarouselItemContainer({
          igBusinessAccountId,
          imageUrl,
          accessToken,
        });
        childrenIds.push(child.creationId);
      }
      ({ creationId } = await createCarouselContainer({
        igBusinessAccountId,
        childrenIds,
        caption,
        accessToken,
      }));
    }
    const { mediaId } = await publishMedia({
      igBusinessAccountId,
      creationId,
      accessToken,
    });

    await prisma.postInstagramDetails.update({
      where: { postId: post.id },
      data: {
        status: InstagramStatus.POSTED,
        postUrl: `https://www.instagram.com/p/${mediaId}/`,
        lastError: null,
      },
    });
    return true;
  } catch (error) {
    const attempts = post.instagramDetails.attempts + 1;
    await prisma.postInstagramDetails.update({
      where: { postId: post.id },
      data: {
        attempts,
        lastError:
          error instanceof Error ? error.message : "Unbekannter Fehler",
        status:
          attempts >= MAX_ATTEMPTS
            ? InstagramStatus.FAILED
            : InstagramStatus.PENDING,
      },
    });
    return false;
  }
}

export async function refreshConnectionIfNeeded(): Promise<void> {
  const connection = await prisma.instagramConnection.findFirst();
  if (!connection) return;

  const msUntilExpiry = connection.expiresAt.getTime() - Date.now();
  if (msUntilExpiry >= REFRESH_THRESHOLD_MS) return;

  try {
    const { accessToken, expiresInSeconds } = await refreshLongLivedToken(
      decryptSecret(connection.accessToken),
    );
    await prisma.instagramConnection.update({
      where: { id: connection.id },
      data: {
        accessToken: encryptSecret(accessToken),
        expiresAt: new Date(
          Date.now() + (expiresInSeconds ?? DEFAULT_EXPIRES_IN_SECONDS) * 1000,
        ),
      },
    });
  } catch (error) {
    console.error("Instagram token refresh failed:", error);
  }
}

export async function processQueue(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const duePosts = await findDuePosts();

  let succeeded = 0;
  let failed = 0;
  for (const post of duePosts) {
    const success = await processPost(post);
    if (success) succeeded++;
    else failed++;
  }

  return { processed: duePosts.length, succeeded, failed };
}
