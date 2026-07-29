import { InstagramStatus, type Post } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveCoverImageUrl } from "@/lib/instagram/cover-image";
import {
  createMediaContainer,
  publishMedia,
  refreshLongLivedToken,
} from "@/lib/instagram/graph-client";

const MAX_ATTEMPTS = 3;
const REFRESH_THRESHOLD_MS = 10 * 24 * 60 * 60 * 1000;
const DEFAULT_EXPIRES_IN_SECONDS = 60 * 24 * 60 * 60;

function buildCaption(post: Pick<Post, "title" | "excerpt" | "slug">): string {
  const siteUrl = process.env.PUBLIC_SITE_URL ?? "";
  return `${post.title}\n\n${post.excerpt}\n\nMehr dazu: ${siteUrl}/news/${post.slug}`;
}

export function findDuePosts() {
  return prisma.post.findMany({
    where: {
      instagram: true,
      instagramStatus: { in: [InstagramStatus.PENDING, InstagramStatus.QUEUED] },
      instagramAttempts: { lt: MAX_ATTEMPTS },
    },
  });
}

export async function processPost(post: Post): Promise<boolean> {
  try {
    const connection = await prisma.instagramConnection.findFirst();
    if (!connection) {
      throw new Error("Keine aktive Instagram-Verbindung vorhanden.");
    }

    const imageUrl = await resolveCoverImageUrl(post);
    const caption = buildCaption(post);

    const { creationId } = await createMediaContainer({
      igBusinessAccountId: connection.igBusinessAccountId,
      imageUrl,
      caption,
      accessToken: connection.accessToken,
    });
    const { mediaId } = await publishMedia({
      igBusinessAccountId: connection.igBusinessAccountId,
      creationId,
      accessToken: connection.accessToken,
    });

    await prisma.post.update({
      where: { id: post.id },
      data: {
        instagramStatus: InstagramStatus.POSTED,
        instagramPostUrl: `https://www.instagram.com/p/${mediaId}/`,
        instagramLastError: null,
      },
    });
    return true;
  } catch (error) {
    const attempts = post.instagramAttempts + 1;
    await prisma.post.update({
      where: { id: post.id },
      data: {
        instagramAttempts: attempts,
        instagramLastError:
          error instanceof Error ? error.message : "Unbekannter Fehler",
        instagramStatus:
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
      connection.accessToken,
    );
    await prisma.instagramConnection.update({
      where: { id: connection.id },
      data: {
        accessToken,
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
