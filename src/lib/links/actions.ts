"use server";

import { revalidatePath } from "next/cache";
import { actionPermissionDenied } from "@/lib/auth/action-guards";
import { prisma } from "@/lib/utils/prisma";
import { normaliseBlobPath } from "@/lib/utils/blob-path";
import { createBlobUploadToken } from "@/lib/utils/blob-upload-token";
import { deleteBlobs } from "@/lib/utils/blob-delete";
import { toStoredBlobRef } from "@/lib/utils/blob-access";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

function revalidateLinkPaths() {
  revalidatePath("/dashboard");
}

export type ImportantLinkInput = {
  title: string;
  targetUrl: string;
  /** Upload-URL des Icons — gespeichert wird der Key (#112). */
  iconUrl?: string;
};

/** Upload-URL → Objekt-Key, nur unter `important-links/` (#112). */
function toImportantLinkData({ iconUrl, ...rest }: ImportantLinkInput) {
  return {
    ...rest,
    iconKey: iconUrl ? toStoredBlobRef(iconUrl, "important-links") : null,
  };
}

export async function createImportantLink(input: ImportantLinkInput) {
  const forbidden = await actionPermissionDenied("links:manage");
  if (forbidden) return forbidden;

  await prisma.importantLink.create({ data: toImportantLinkData(input) });

  revalidateLinkPaths();
  return { success: true as const };
}

export async function updateImportantLink(
  id: string,
  input: ImportantLinkInput,
) {
  const forbidden = await actionPermissionDenied("links:manage");
  if (forbidden) return forbidden;

  await prisma.importantLink.update({
    where: { id },
    data: toImportantLinkData(input),
  });

  revalidateLinkPaths();
  return { success: true as const };
}

export async function deleteImportantLink(id: string) {
  const forbidden = await actionPermissionDenied("links:manage");
  if (forbidden) return forbidden;

  const link = await prisma.importantLink.findUnique({
    where: { id },
    select: { iconKey: true },
  });
  if (!link) {
    return { error: "Link nicht gefunden." };
  }

  if (link.iconKey) {
    await deleteBlobs([link.iconKey]);
  }
  await prisma.importantLink.delete({ where: { id } });

  revalidateLinkPaths();
  return { success: true as const };
}

export async function getImportantLinkUploadToken(
  pathname: string,
  contentType: string,
) {
  const forbidden = await actionPermissionDenied("links:manage");
  if (forbidden) throw new Error(forbidden.error);

  return createBlobUploadToken({
    pathname: normaliseBlobPath(pathname, "important-links"),
    contentType,
    allowedContentTypes: ["image/png", "image/jpeg", "image/webp"],
    addRandomSuffix: true,
    maximumSizeInBytes: MAX_UPLOAD_BYTES,
  });
}
