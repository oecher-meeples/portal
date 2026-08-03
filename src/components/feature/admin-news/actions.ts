"use server";

import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { InstagramStatus, type NewsletterCategory } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import { getCurrentUser } from "@/lib/auth/server";
import { hasPermission } from "@/lib/auth/permissions";
import { TYPE_TO_DB, type ContentType } from "@/lib/content/content";
import { processPost } from "@/lib/instagram/queue";
import { queueNewsletterForPost } from "@/lib/newsletter/dispatch";
import { normaliseBlobPath } from "@/lib/utils/blob-path";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export type PostInput = {
  type: ContentType;
  title: string;
  excerpt: string;
  body: string;
  date: string;
  author?: string;
  location?: string;
  internal?: boolean;
  instagram?: boolean;
  status: "DRAFT" | "PUBLISHED";
  sendAsNewsletter?: boolean;
  newsletterCategory?: NewsletterCategory | null;
  coverImageUrl?: string;
};

function slugify(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function validatePostInput(input: PostInput) {
  if (!input.title || !input.type || !input.date || !input.body) {
    return "Bitte Titel, Typ, Datum und Inhalt ausfüllen.";
  }
  return null;
}

/** Falls back to the first 130 characters of the body when no excerpt was given. */
function deriveExcerpt(excerpt: string | undefined, body: string) {
  const trimmed = excerpt?.trim();
  if (trimmed) return trimmed;
  return body.length > 130 ? `${body.slice(0, 130)}...` : body;
}

function toPostData(input: PostInput) {
  return {
    type: TYPE_TO_DB[input.type],
    title: input.title,
    excerpt: deriveExcerpt(input.excerpt, input.body),
    body: input.body,
    date: new Date(input.date),
    author: input.author || null,
    location: input.location || null,
    internal: input.internal ?? null,
    instagram: input.instagram ?? null,
    status: input.status,
    sendAsNewsletter: input.sendAsNewsletter ?? false,
    newsletterCategory: input.newsletterCategory ?? null,
    coverImageUrl: input.coverImageUrl || null,
  };
}

function shouldQueueNewsletter(input: PostInput) {
  return Boolean(
    input.sendAsNewsletter &&
    input.status === "PUBLISHED" &&
    input.newsletterCategory,
  );
}

export async function createPost(input: PostInput) {
  const user = await getCurrentUser();
  if (!user || !(await hasPermission(user.id, "posts:write"))) {
    return { error: "Keine Berechtigung." };
  }

  const validationError = validatePostInput(input);
  if (validationError) {
    return { error: validationError };
  }

  const post = await prisma.post.create({
    data: {
      slug: slugify(input.title),
      ...toPostData(input),
      // Interne Beiträge und Entwürfe werden nie in die Instagram-Queue eingereiht.
      instagramStatus:
        input.instagram && !input.internal && input.status === "PUBLISHED"
          ? InstagramStatus.PENDING
          : null,
    },
  });

  if (shouldQueueNewsletter(input)) {
    await queueNewsletterForPost(post.id);
  }

  return { success: true as const, id: post.id };
}

export async function updatePost(id: string, input: PostInput) {
  const user = await getCurrentUser();
  if (!user || !(await hasPermission(user.id, "posts:write"))) {
    return { error: "Keine Berechtigung." };
  }

  const validationError = validatePostInput(input);
  if (validationError) {
    return { error: validationError };
  }

  const wantsNewsletter = shouldQueueNewsletter(input);
  const needsExisting =
    (!input.internal && input.status === "PUBLISHED" && input.instagram) ||
    wantsNewsletter;
  const existing = needsExisting
    ? await prisma.post.findUnique({
        where: { id },
        select: { instagramStatus: true, newsletterStatus: true },
      })
    : null;

  let instagramStatus: InstagramStatus | null | undefined;
  if (input.internal || input.status !== "PUBLISHED") {
    // Interne Beiträge und Entwürfe werden nie in die Instagram-Queue
    // eingereiht, auch wenn sie es vorher schon waren.
    instagramStatus = null;
  } else if (input.instagram && !existing?.instagramStatus) {
    instagramStatus = InstagramStatus.PENDING;
  }

  await prisma.post.update({
    where: { id },
    data: {
      ...toPostData(input),
      ...(instagramStatus !== undefined ? { instagramStatus } : {}),
    },
  });

  // Ein Entwurf mit gesetzter Checkbox, der jetzt veröffentlicht wird, löst
  // den Versand aus. Bereits queued/gesendete Beiträge werden nicht erneut
  // eingereiht, auch wenn die Checkbox weiterhin aktiv ist.
  if (wantsNewsletter && !existing?.newsletterStatus) {
    await queueNewsletterForPost(id);
  }

  return { success: true as const };
}

export async function getUploadToken(pathname: string) {
  const user = await getCurrentUser();
  if (!user || !(await hasPermission(user.id, "posts:write"))) {
    throw new Error("Keine Berechtigung.");
  }

  return generateClientTokenFromReadWriteToken({
    pathname: normaliseBlobPath(pathname, "instagram-covers"),
    allowedContentTypes: ["image/png", "image/jpeg", "image/webp"],
    addRandomSuffix: true,
    maximumSizeInBytes: MAX_UPLOAD_BYTES,
  });
}

export async function retryInstagramPost(postId: string) {
  const user = await getCurrentUser();
  if (!user || !(await hasPermission(user.id, "posts:write"))) {
    return { error: "Keine Berechtigung." };
  }

  const post = await prisma.post.update({
    where: { id: postId },
    data: {
      instagramAttempts: 0,
      instagramStatus: InstagramStatus.PENDING,
      instagramLastError: null,
    },
  });

  const success = await processPost(post);
  return { success: true as const, posted: success };
}

export async function deletePost(id: string) {
  const user = await getCurrentUser();
  if (!user || !(await hasPermission(user.id, "posts:delete"))) {
    return { error: "Keine Berechtigung." };
  }

  await prisma.post.delete({ where: { id } });

  return { success: true as const };
}
