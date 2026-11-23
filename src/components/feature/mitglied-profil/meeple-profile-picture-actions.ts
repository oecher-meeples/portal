"use server";

import type { ProfilePictureVisibility } from "@prisma/client";
import { requireActionPermission } from "@/lib/auth/action-guards";
import { requireMember } from "@/lib/auth/session";
import { prisma } from "@/lib/utils/prisma";
import { revalidateMemberProfile } from "@/lib/members/revalidate-profile";
import { normaliseBlobPath } from "@/lib/utils/blob-path";
import { createBlobUploadToken } from "@/lib/utils/blob-upload-token";
import { deleteBlobs } from "@/lib/utils/blob-delete";
import { toStoredBlobRef } from "@/lib/utils/blob-access";

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/** Serverseitige Prüfung: das Meeple selbst oder `members:manage` (#389) —
 * niemals einem client-übergebenen `meepleId` blind vertrauen. */
async function assertMayEdit(meepleId: string) {
  const session = await requireMember();
  if (session.meeple.id === meepleId) return;
  await requireActionPermission("members:manage");
}

export async function getMeepleProfilePictureUploadToken(
  meepleId: string,
  pathname: string,
  contentType: string,
) {
  await assertMayEdit(meepleId);

  return createBlobUploadToken({
    pathname: normaliseBlobPath(pathname, "meeple-profile-pictures"),
    contentType,
    allowedContentTypes: ["image/png", "image/jpeg", "image/webp"],
    addRandomSuffix: true,
    maximumSizeInBytes: MAX_UPLOAD_BYTES,
  });
}

export async function saveMeepleProfilePicture(
  meepleId: string,
  /** URL aus dem Upload — gespeichert wird der Key (#112). */
  url: string,
  visibility: ProfilePictureVisibility,
) {
  await assertMayEdit(meepleId);

  const previous = await prisma.meeple.findUniqueOrThrow({
    where: { id: meepleId },
    select: { profilePictureKey: true },
  });
  await prisma.meeple.update({
    where: { id: meepleId },
    data: {
      profilePictureKey: toStoredBlobRef(url, "meeple-profile-pictures"),
      profilePictureVisibility: visibility,
    },
  });
  if (previous.profilePictureKey) {
    await deleteBlobs([previous.profilePictureKey]);
  }

  await revalidateMemberProfile({ meepleId: meepleId });
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

  await revalidateMemberProfile({ meepleId: meepleId });
  return { success: true as const };
}

/** Löschbar/entfernbar durch das Meeple selbst (#389). */
export async function deleteMeepleProfilePicture(meepleId: string) {
  await assertMayEdit(meepleId);

  const meeple = await prisma.meeple.findUniqueOrThrow({
    where: { id: meepleId },
    select: { profilePictureKey: true },
  });
  if (meeple.profilePictureKey) {
    await deleteBlobs([meeple.profilePictureKey]);
  }

  await prisma.meeple.update({
    where: { id: meepleId },
    data: { profilePictureKey: null },
  });

  await revalidateMemberProfile({ meepleId: meepleId });
  return { success: true as const };
}
