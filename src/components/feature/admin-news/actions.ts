"use server";

import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import {
  InstagramStatus,
  type NewsletterCategory,
  type Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import { getCurrentUser } from "@/lib/auth/server";
import { hasPermission } from "@/lib/auth/permissions";
import { TYPE_TO_DB, type ContentType } from "@/lib/content/content";
import {
  canManagePostType,
  getPostPermissions,
} from "@/lib/content/post-permissions";
import { processPost, type DuePost } from "@/lib/instagram/queue";
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

/** Nested `instagramDetails`-Write für `post.update()` — löscht die Zeile bei
 * internen Beiträgen/Entwürfen (die nie in der Queue landen dürfen), legt sie
 * bei frisch aktiviertem Instagram-Toggle eager mit PENDING an, sonst
 * unverändert. */
function buildInstagramDetailsUpdate(
  input: PostInput,
  hasExisting: boolean,
): Prisma.PostUpdateInput["instagramDetails"] | undefined {
  if (input.internal || input.status !== "PUBLISHED") {
    return hasExisting ? { delete: true } : undefined;
  }
  if (input.instagram && !hasExisting) {
    return { create: { status: InstagramStatus.PENDING } };
  }
  return undefined;
}

export async function createPost(input: PostInput) {
  const user = await getCurrentUser();
  if (!user) return { error: "Keine Berechtigung." };
  const perms = await getPostPermissions(user.id);
  if (!canManagePostType(perms, input.internal)) {
    return { error: "Keine Berechtigung." };
  }

  const validationError = validatePostInput(input);
  if (validationError) {
    return { error: validationError };
  }

  // Interne Beiträge und Entwürfe werden nie in die Instagram-Queue eingereiht.
  const queueForInstagram =
    input.instagram && !input.internal && input.status === "PUBLISHED";
  const post = await prisma.post.create({
    data: {
      slug: slugify(input.title),
      ...toPostData(input),
      ...(queueForInstagram
        ? { instagramDetails: { create: { status: InstagramStatus.PENDING } } }
        : {}),
    },
  });

  if (shouldQueueNewsletter(input)) {
    await queueNewsletterForPost(post.id);
  }

  return { success: true as const, id: post.id };
}

export async function updatePost(id: string, input: PostInput) {
  const user = await getCurrentUser();
  if (!user) return { error: "Keine Berechtigung." };

  const validationError = validatePostInput(input);
  if (validationError) {
    return { error: validationError };
  }

  // Immer geladen (statt nur bedingt) — die Berechtigungsprüfung braucht den
  // bisherigen internal-Wert so oder so: wer nur posts:public hat, darf
  // weder einen internen Beitrag anfassen noch einen öffentlichen intern
  // machen (#321).
  const existing = await prisma.post.findUnique({
    where: { id },
    select: {
      internal: true,
      newsletterStatus: true,
      instagramDetails: { select: { id: true } },
    },
  });
  if (!existing) {
    return { error: "Beitrag nicht gefunden." };
  }

  const perms = await getPostPermissions(user.id);
  if (
    !canManagePostType(perms, existing.internal) ||
    !canManagePostType(perms, input.internal)
  ) {
    return { error: "Keine Berechtigung." };
  }

  const wantsNewsletter = shouldQueueNewsletter(input);
  const instagramDetails = buildInstagramDetailsUpdate(
    input,
    Boolean(existing?.instagramDetails),
  );

  await prisma.post.update({
    where: { id },
    data: {
      ...toPostData(input),
      ...(instagramDetails ? { instagramDetails } : {}),
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
  const perms = user ? await getPostPermissions(user.id) : null;
  if (!perms || (!perms.canEditPublic && !perms.canEditInternal)) {
    throw new Error("Keine Berechtigung.");
  }

  return generateClientTokenFromReadWriteToken({
    pathname: normaliseBlobPath(pathname, "instagram-covers"),
    allowedContentTypes: ["image/png", "image/jpeg", "image/webp"],
    addRandomSuffix: true,
    maximumSizeInBytes: MAX_UPLOAD_BYTES,
  });
}

/** Instagram-Crosspost gibt es nur für öffentliche Beiträge (die Checkbox
 * ist in post-form.tsx bei internen Beiträgen deaktiviert) — daher genügt
 * hier posts:public, kein posts:internal-Fall zu prüfen. */
export async function retryInstagramPost(postId: string) {
  const user = await getCurrentUser();
  if (!user || !(await hasPermission(user.id, "posts:public"))) {
    return { error: "Keine Berechtigung." };
  }

  const post = await prisma.post.update({
    where: { id: postId },
    data: {
      instagramDetails: {
        upsert: {
          create: { status: InstagramStatus.PENDING },
          update: {
            attempts: 0,
            status: InstagramStatus.PENDING,
            lastError: null,
          },
        },
      },
    },
    include: { instagramDetails: true },
  });

  const success = await processPost(post as DuePost);
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
