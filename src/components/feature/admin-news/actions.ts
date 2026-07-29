"use server";

import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { InstagramStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/server";
import { hasPermission } from "@/lib/permissions";
import { TYPE_TO_DB, type ContentType } from "@/lib/content";
import { processPost } from "@/lib/instagram/queue";

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
  if (
    !input.title ||
    !input.type ||
    !input.date ||
    !input.excerpt ||
    !input.body
  ) {
    return "Bitte Titel, Typ, Datum, Excerpt und Inhalt ausfüllen.";
  }
  return null;
}

function toPostData(input: PostInput) {
  return {
    type: TYPE_TO_DB[input.type],
    title: input.title,
    excerpt: input.excerpt,
    body: input.body,
    date: new Date(input.date),
    author: input.author || null,
    location: input.location || null,
    internal: input.internal ?? null,
    instagram: input.instagram ?? null,
    coverImageUrl: input.coverImageUrl || null,
  };
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
      instagramStatus: input.instagram ? InstagramStatus.PENDING : null,
    },
  });

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

  let instagramStatus: InstagramStatus | undefined;
  if (input.instagram) {
    const existing = await prisma.post.findUnique({
      where: { id },
      select: { instagramStatus: true },
    });
    if (!existing?.instagramStatus) {
      instagramStatus = InstagramStatus.PENDING;
    }
  }

  await prisma.post.update({
    where: { id },
    data: {
      ...toPostData(input),
      ...(instagramStatus ? { instagramStatus } : {}),
    },
  });

  return { success: true as const };
}

export async function getUploadToken(pathname: string) {
  const user = await getCurrentUser();
  if (!user || !(await hasPermission(user.id, "posts:write"))) {
    throw new Error("Keine Berechtigung.");
  }

  return generateClientTokenFromReadWriteToken({
    pathname,
    allowedContentTypes: ["image/png", "image/jpeg", "image/webp"],
    addRandomSuffix: true,
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
