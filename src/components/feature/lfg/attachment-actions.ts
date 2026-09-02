"use server";

import { revalidatePath } from "next/cache";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { prisma } from "@/lib/utils/prisma";
import { requireMeeplePermission } from "@/lib/members/meeples";
import { normaliseBlobPath } from "@/lib/utils/blob-path";
import { deleteBlobs } from "@/lib/utils/blob-delete";
import { isLfgAttachmentEligible } from "@/lib/content/lfg";

// Eigene Datei statt in actions.ts (#283) — dort wäre die Zeilengrenze
// (max-lines) überschritten worden; Datei-Anhänge sind fachlich klar von den
// übrigen LFG-Actions (Beitreten/Verlassen/Schließen/Ort) abgrenzbar.

const MAX_LFG_ATTACHMENT_BYTES = 20 * 1024 * 1024;

/** Jeder Teilnehmer (Ersteller inklusive — der wird bei `createLfgPost()`
 * selbst als `LfgParticipant` angelegt) darf Anhänge hoch-/herunterladen
 * (#283) — ein einziger Check reicht, anders als bei `addLfgGuest()`, das dem
 * Ersteller zusätzliche Rechte einräumt. */
async function requireLfgParticipant(postId: string, meepleId: string) {
  const participant = await prisma.lfgParticipant.findFirst({
    where: { postId, meepleId },
  });
  if (!participant) {
    return { error: "Nur Teilnehmende können darauf zugreifen." } as const;
  }
  return { participant } as const;
}

async function requireEligiblePost(postId: string) {
  const post = await prisma.lfgPost.findUnique({ where: { id: postId } });
  if (!post) {
    return { error: "Gesuch nicht gefunden." } as const;
  }
  if (!isLfgAttachmentEligible(post)) {
    return {
      error: "Uploads sind erst am oder nach dem geplanten Termin möglich.",
    } as const;
  }
  return { post } as const;
}

/** Token-Ausstellung für `useBlobUpload()` — wirft statt `{ error }`
 * zurückzugeben, weil `getToken` laut `useBlobUpload`-Vertrag
 * `Promise<string>` liefert; der Aufrufer fängt das im try/catch auf. */
export async function getLfgAttachmentUploadToken(
  postId: string,
  pathname: string,
) {
  const meeple = await requireMeeplePermission("lfg:participate");

  const eligible = await requireEligiblePost(postId);
  if ("error" in eligible) throw new Error(eligible.error);

  const participant = await requireLfgParticipant(postId, meeple.id);
  if ("error" in participant) throw new Error(participant.error);

  return generateClientTokenFromReadWriteToken({
    pathname: normaliseBlobPath(pathname, "lfg-attachments"),
    addRandomSuffix: true,
    maximumSizeInBytes: MAX_LFG_ATTACHMENT_BYTES,
  });
}

export async function createLfgAttachment(
  postId: string,
  url: string,
  filename: string,
) {
  const meeple = await requireMeeplePermission("lfg:participate");

  const eligible = await requireEligiblePost(postId);
  if ("error" in eligible) return eligible;

  const participant = await requireLfgParticipant(postId, meeple.id);
  if ("error" in participant) return participant;

  await prisma.lfgAttachment.create({
    data: { postId, uploadedByMeepleId: meeple.id, url, filename },
  });

  revalidatePath(`/lfg/${postId}`);
  return { success: true as const };
}

/** Löschen darf, wer die Datei hochgeladen hat, plus immer der Ersteller des
 * Gesuchs (analog `removeLfgGuest()`). */
export async function deleteLfgAttachment(attachmentId: string) {
  const meeple = await requireMeeplePermission("lfg:participate");

  const attachment = await prisma.lfgAttachment.findUnique({
    where: { id: attachmentId },
    include: { post: { select: { id: true, createdByMeepleId: true } } },
  });
  if (!attachment) {
    return { error: "Datei nicht gefunden." };
  }

  const canDelete =
    attachment.uploadedByMeepleId === meeple.id ||
    attachment.post.createdByMeepleId === meeple.id;
  if (!canDelete) {
    return { error: "Du kannst diese Datei nicht löschen." };
  }

  await deleteBlobs([attachment.url]);
  await prisma.lfgAttachment.delete({ where: { id: attachmentId } });

  revalidatePath(`/lfg/${attachment.post.id}`);
  return { success: true as const };
}
