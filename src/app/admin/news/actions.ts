"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/server";
import { hasPermission } from "@/lib/permissions";
import { TYPE_TO_DB, type ContentType } from "@/lib/content";

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
  if (!input.title || !input.type || !input.date || !input.excerpt || !input.body) {
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
    data: { slug: slugify(input.title), ...toPostData(input) },
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

  await prisma.post.update({ where: { id }, data: toPostData(input) });

  return { success: true as const };
}

export async function deletePost(id: string) {
  const user = await getCurrentUser();
  if (!user || !(await hasPermission(user.id, "posts:delete"))) {
    return { error: "Keine Berechtigung." };
  }

  await prisma.post.delete({ where: { id } });

  return { success: true as const };
}
