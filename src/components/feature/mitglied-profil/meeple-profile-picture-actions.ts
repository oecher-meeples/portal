"use server";

import { revalidatePath } from "next/cache";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import type { ProfilePictureVisibility } from "@prisma/client";
import { requirePermission } from "@/lib/auth/permissions";
import { requireMember } from "@/lib/auth/session";
import { prisma } from "@/lib/utils/prisma";
import { normaliseBlobPath } from "@/lib/utils/blob-path";
import { deleteBlobs } from "@/lib/utils/blob-delete";

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/** Serverseitige Prüfung: das Meeple selbst oder `members:manage` (#389) —
 * niemals einem client-übergebenen `meepleId` blind vertrauen. */
async function assertMayEdit(meepleId: string) {
  const session = await requireMember();
  if (session.meeple.id === meepleId) return;
  await requirePermission("members:manage");
}

export async function getMeepleProfilePictureUploadToken(
  meepleId: string,
  pathname: string,
) {
  await assertMayEdit(meepleId);

  return generateClientTokenFromReadWriteToken({
    pathname: normaliseBlobPath(pathname, "meeple-profile-pictures"),
    allowedContentTypes: ["image/png", "image/jpeg", "image/webp"],
    addRandomSuffix: true,
    maximumSizeInBytes: MAX_UPLOAD_BYTES,
  });
}

async function revalidateProfile(meepleId: string) {
  const member = await prisma.member.findUnique({
    where: { meepleId },
    select: { slug: true },
  });
  if (member) revalidatePath(`/profil/${member.slug}`);
}

export async function saveMeepleProfilePicture(
  meepleId: string,
  url: string,
  visibility: ProfilePictureVisibility,
) {
  await assertMayEdit(meepleId);

  const previous = await prisma.meeple.findUniqueOrThrow({
    where: { id: meepleId },
    select: { profilePictureUrl: true },
  });
  await prisma.meeple.update({
    where: { id: meepleId },
    data: { profilePictureUrl: url, profilePictureVisibility: visibility },
  });
  if (previous.profilePictureUrl) {
    await deleteBlobs([previous.profilePictureUrl]);
  }

  await revalidateProfile(meepleId);
  return { success: true as const };
}

export async function updateMeepleProfilePictureVisibility(
  meepleId: string,
  visibility: ProfilePictureVisibility,
) {
  await assertMayEdit(meepleId);

  await prisma.meeple.update({
    where: { id: meepleId },
    data: { profilePictureVisibility: visibility },
  });

  await revalidateProfile(meepleId);
  return { success: true as const };
}

/** Löschbar/entfernbar durch das Meeple selbst (#389). */
export async function deleteMeepleProfilePicture(meepleId: string) {
  await assertMayEdit(meepleId);

  const meeple = await prisma.meeple.findUniqueOrThrow({
    where: { id: meepleId },
    select: { profilePictureUrl: true },
  });
  if (meeple.profilePictureUrl) {
    await deleteBlobs([meeple.profilePictureUrl]);
  }

  await prisma.meeple.update({
    where: { id: meepleId },
    data: { profilePictureUrl: null },
  });

  await revalidateProfile(meepleId);
  return { success: true as const };
}
