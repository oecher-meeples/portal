"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/utils/prisma";
import { hasPermission } from "@/lib/auth/permissions";
import { requireMeeple, requireMeeplePermission } from "@/lib/members/meeples";
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
  /** Erlaubt beigetretenen Meeples, das Ortsfeld selbst zu bearbeiten (#166) — der Ersteller darf das immer. */
  participantsMayEditLocation?: boolean;
  maxParticipants: number;
  /** Erlaubt beigetretenen Meeples, eigene Gäste hinzuzufügen (#145) — der Ersteller darf das immer. */
  guestsMayBringGuests?: boolean;
};

export async function createLfgPost(input: LfgPostInput) {
  const meeple = await requireMeeplePermission("lfg:participate");

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
        participantsMayEditLocation: input.participantsMayEditLocation ?? false,
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

/** Loads the post and rejects with the matching German error unless it's
 * still open for new participants/guests — shared by `joinLfgPost()` and
 * `addLfgGuest()`, which both gate on exactly this. */
async function loadJoinablePost(postId: string) {
  const post = await loadPostWithParticipantCount(postId);
  if (!post) {
    return { error: "Gesuch nicht gefunden." } as const;
  }

  const status = getLfgStatus(post, post._count.participants);
  if (status === "geschlossen") {
    return { error: "Dieses Gesuch ist geschlossen." } as const;
  }
  if (status === "abgelaufen") {
    return { error: "Dieses Gesuch ist abgelaufen." } as const;
  }
  if (status === "voll") {
    return { error: "Dieses Gesuch ist bereits voll." } as const;
  }

  return { post } as const;
}

export async function joinLfgPost(postId: string) {
  const meeple = await requireMeeplePermission("lfg:participate");

  const result = await loadJoinablePost(postId);
  if ("error" in result) {
    return result;
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
  const meeple = await requireMeeplePermission("lfg:participate");

  const result = await loadJoinablePost(postId);
  if ("error" in result) {
    return result;
  }
  const { post } = result;

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
  const meeple = await requireMeeplePermission("lfg:participate");

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
  const meeple = await requireMeeplePermission("lfg:participate");

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

/** Ersteller darf das Ortsfeld immer bearbeiten; beigetretene Meeples nur,
 * wenn `participantsMayEditLocation` aktiv ist (#166) — analog `addLfgGuest`. */
async function requireLfgLocationEditRight(postId: string, meepleId: string) {
  const post = await prisma.lfgPost.findUnique({ where: { id: postId } });
  if (!post) {
    return { error: "Gesuch nicht gefunden." } as const;
  }

  const isCreator = post.createdByMeepleId === meepleId;
  if (!isCreator) {
    if (!post.participantsMayEditLocation) {
      return { error: "Nur der Ersteller darf den Ort ändern." } as const;
    }
    const isParticipant = await prisma.lfgParticipant.findFirst({
      where: { postId, meepleId },
    });
    if (!isParticipant) {
      return { error: "Nur Teilnehmende können den Ort ändern." } as const;
    }
  }

  return { post } as const;
}

export async function updateLfgLocation(postId: string, location: string) {
  const meeple = await requireMeeplePermission("lfg:participate");

  const result = await requireLfgLocationEditRight(postId, meeple.id);
  if ("error" in result) {
    return result;
  }

  await prisma.lfgPost.update({
    where: { id: postId },
    data: { location: location.trim() || null },
  });

  revalidatePath("/lfg");
  revalidatePath(`/lfg/${postId}`);
  return { success: true as const };
}

/** Übernimmt die im Profil hinterlegte Adresse als Ort (#166) — Adresse und
 * Klingel-Notiz kommen bewusst serverseitig aus `meeple`, nicht vom Client,
 * damit niemand eine fremde Adresse unterschieben kann. Hängt eine vorhandene
 * Klingel-Notiz an die Beschreibung an, statt sie zu überschreiben. */
export async function useOwnAddressAsLfgLocation(postId: string) {
  const meeple = await requireMeeplePermission("lfg:participate");

  const result = await requireLfgLocationEditRight(postId, meeple.id);
  if ("error" in result) {
    return result;
  }
  const { post } = result;

  if (!meeple.address) {
    return { error: "In deinem Profil ist keine Adresse hinterlegt." };
  }

  const description = meeple.doorbellNote
    ? `${post.description}\n\nKlingelschild: ${meeple.doorbellNote}`
    : post.description;

  await prisma.lfgPost.update({
    where: { id: postId },
    data: { location: meeple.address, description },
  });

  revalidatePath("/lfg");
  revalidatePath(`/lfg/${postId}`);
  return { success: true as const };
}
