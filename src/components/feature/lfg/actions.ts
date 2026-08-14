"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/utils/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { requireMeeple } from "@/lib/members/meeples";
import { getLfgStatus } from "@/lib/content/lfg";

export type LfgPostInput = {
  title: string;
  gameTitle?: string | null;
  /** Optional link to an inventory title (#34) — never required, gameTitle stays independent. */
  boardGameId?: string | null;
  description: string;
  plannedAt?: Date | null;
  dateNote?: string | null;
  location?: string | null;
  maxParticipants: number;
  /** Erlaubt beigetretenen Meeples, eigene Gäste hinzuzufügen (#145) — der Ersteller darf das immer. */
  guestsMayBringGuests?: boolean;
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
        boardGameId: input.boardGameId || null,
        description: input.description,
        plannedAt: input.plannedAt ?? null,
        dateNote: input.dateNote || null,
        location: input.location || null,
        maxParticipants: input.maxParticipants,
        guestsMayBringGuests: input.guestsMayBringGuests ?? false,
        createdByMeepleId: meeple.id,
      },
    });
    await tx.lfgParticipant.create({
      data: {
        postId: created.id,
        meepleId: meeple.id,
        addedByMeepleId: meeple.id,
      },
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
    data: { postId, meepleId: meeple.id, addedByMeepleId: meeple.id },
  });

  revalidatePath("/lfg");
  revalidatePath(`/lfg/${postId}`);
  return { success: true as const };
}

/** Ersteller darf immer Gäste hinzufügen; beigetretene Meeples nur, wenn
 * `guestsMayBringGuests` aktiv ist (#145). Anzeigename ist immer generiert. */
export async function addLfgGuest(postId: string) {
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

  const isCreator = post.createdByMeepleId === meeple.id;
  if (!isCreator) {
    if (!post.guestsMayBringGuests) {
      return {
        error: "Gäste mitbringen ist für dieses Gesuch nicht erlaubt.",
      };
    }
    const isParticipant = await prisma.lfgParticipant.findFirst({
      where: { postId, meepleId: meeple.id },
    });
    if (!isParticipant) {
      return { error: "Nur Teilnehmende können Gäste mitbringen." };
    }
  }

  await prisma.lfgParticipant.create({
    data: { postId, meepleId: null, addedByMeepleId: meeple.id },
  });

  revalidatePath("/lfg");
  revalidatePath(`/lfg/${postId}`);
  return { success: true as const };
}

/** Entfernen darf, wer den Gast hinzugefügt hat; der Ersteller zusätzlich
 * jeden Gast (#145). */
export async function removeLfgGuest(participantId: string) {
  const meeple = await requireMeeple();

  const participant = await prisma.lfgParticipant.findUnique({
    where: { id: participantId },
    include: { post: { select: { createdByMeepleId: true } } },
  });
  if (!participant || participant.meepleId !== null) {
    return { error: "Gast nicht gefunden." };
  }

  const canRemove =
    participant.addedByMeepleId === meeple.id ||
    participant.post.createdByMeepleId === meeple.id;
  if (!canRemove) {
    return { error: "Du kannst diesen Gast nicht entfernen." };
  }

  await prisma.lfgParticipant.delete({ where: { id: participantId } });

  revalidatePath("/lfg");
  revalidatePath(`/lfg/${participant.postId}`);
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
