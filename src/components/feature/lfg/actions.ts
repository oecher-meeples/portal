"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/utils/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { requireMeeple } from "@/lib/members/meeples";
import { getLfgStatus } from "@/lib/content/lfg";

export type LfgPostInput = {
  title: string;
  gameTitle?: string | null;
  description: string;
  plannedAt?: Date | null;
  dateNote?: string | null;
  location?: string | null;
  maxParticipants: number;
};

export async function createLfgPost(input: LfgPostInput) {
  const meeple = await requireMeeple();

  if (!input.title.trim()) {
    return { error: "Bitte einen Titel angeben." };
  }
  if (!input.maxParticipants || input.maxParticipants < 1) {
    return { error: "Maximale Teilnehmerzahl muss mindestens 1 sein." };
  }

  const post = await prisma.$transaction(async (tx) => {
    const created = await tx.lfgPost.create({
      data: {
        title: input.title.trim(),
        gameTitle: input.gameTitle || null,
        description: input.description,
        plannedAt: input.plannedAt ?? null,
        dateNote: input.dateNote || null,
        location: input.location || null,
        maxParticipants: input.maxParticipants,
        createdByMeepleId: meeple.id,
      },
    });
    await tx.lfgParticipant.create({
      data: { postId: created.id, meepleId: meeple.id },
    });
    return created;
  });

  revalidatePath("/lfg");
  return { success: true as const, id: post.id };
}

async function loadPostWithParticipantCount(postId: string) {
  const post = await prisma.lfgPost.findUnique({
    where: { id: postId },
    include: { _count: { select: { participants: true } } },
  });
  return post;
}

export async function joinLfgPost(postId: string) {
  const meeple = await requireMeeple();

  const post = await loadPostWithParticipantCount(postId);
  if (!post) {
    return { error: "Gesuch nicht gefunden." };
  }

  const status = getLfgStatus(post, post._count.participants);
  if (status === "geschlossen") {
    return { error: "Dieses Gesuch ist geschlossen." };
  }
  if (status === "abgelaufen") {
    return { error: "Dieses Gesuch ist abgelaufen." };
  }
  if (status === "voll") {
    return { error: "Dieses Gesuch ist bereits voll." };
  }

  const existing = await prisma.lfgParticipant.findUnique({
    where: { postId_meepleId: { postId, meepleId: meeple.id } },
  });
  if (existing) {
    return { error: "Du nimmst bereits an diesem Gesuch teil." };
  }

  await prisma.lfgParticipant.create({
    data: { postId, meepleId: meeple.id },
  });

  revalidatePath("/lfg");
  revalidatePath(`/lfg/${postId}`);
  return { success: true as const };
}

export async function leaveLfgPost(postId: string) {
  const meeple = await requireMeeple();

  const post = await prisma.lfgPost.findUnique({ where: { id: postId } });
  if (!post) {
    return { error: "Gesuch nicht gefunden." };
  }
  if (post.createdByMeepleId === meeple.id) {
    return { error: "Der Ersteller kann das eigene Gesuch nicht verlassen." };
  }

  await prisma.lfgParticipant.deleteMany({
    where: { postId, meepleId: meeple.id },
  });

  revalidatePath("/lfg");
  revalidatePath(`/lfg/${postId}`);
  return { success: true as const };
}

export async function closeLfgPost(postId: string) {
  const meeple = await requireMeeple();

  const post = await prisma.lfgPost.findUnique({ where: { id: postId } });
  if (!post) {
    return { error: "Gesuch nicht gefunden." };
  }

  const canClose =
    post.createdByMeepleId === meeple.id ||
    (meeple.neonAuthUserId
      ? await hasPermission(meeple.neonAuthUserId, "members:manage")
      : false);

  if (!canClose) {
    return {
      error: "Nur der Ersteller oder die Mitgliederverwaltung kann schließen.",
    };
  }

  await prisma.lfgPost.update({
    where: { id: postId },
    data: { closedAt: new Date() },
  });

  revalidatePath("/lfg");
  revalidatePath(`/lfg/${postId}`);
  return { success: true as const };
}
