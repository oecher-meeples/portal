"use server";

import { revalidatePath } from "next/cache";
import type { DownloadStatus } from "@prisma/client";
import { actionPermissionDenied } from "@/lib/auth/action-guards";
import { prisma } from "@/lib/utils/prisma";
import { normaliseBlobPath } from "@/lib/utils/blob-path";
import { createBlobUploadToken } from "@/lib/utils/blob-upload-token";
import { deleteBlobs } from "@/lib/utils/blob-delete";
import { toStoredBlobRef } from "@/lib/utils/blob-access";

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

function revalidateDownloadPaths() {
  revalidatePath("/downloads");
}

export type CreateDownloadInput = {
  title: string;
  fileName: string;
  /** URL aus dem Upload — gespeichert wird der Key (#112). */
  fileUrl: string;
  fileType: string;
  fileSizeBytes: number;
};

/** Upload-URL → Objekt-Key, nur unter `downloads/` (#112). */
function toDownloadFileData<T extends { fileUrl: string }>({
  fileUrl,
  ...rest
}: T) {
  return { ...rest, fileKey: toStoredBlobRef(fileUrl, "downloads") };
}

export async function createDownload(input: CreateDownloadInput) {
  const forbidden = await actionPermissionDenied("downloads:manage");
  if (forbidden) return forbidden;

  await prisma.download.create({ data: toDownloadFileData(input) });

  revalidateDownloadPaths();
  return { success: true as const };
}

export async function renameDownload(id: string, title: string) {
  const forbidden = await actionPermissionDenied("downloads:manage");
  if (forbidden) return forbidden;

  const trimmed = title.trim();
  if (!trimmed) {
    return { error: "Titel darf nicht leer sein." };
  }

  await prisma.download.update({ where: { id }, data: { title: trimmed } });

  revalidateDownloadPaths();
  return { success: true as const };
}

export async function setDownloadStatus(id: string, status: DownloadStatus) {
  const forbidden = await actionPermissionDenied("downloads:manage");
  if (forbidden) return forbidden;

  await prisma.download.update({ where: { id }, data: { status } });

  revalidateDownloadPaths();
  return { success: true as const };
}

export async function deleteDownload(id: string) {
  const forbidden = await actionPermissionDenied("downloads:manage");
  if (forbidden) return forbidden;

  const download = await prisma.download.findUnique({
    where: { id },
    select: { fileKey: true },
  });
  if (!download) {
    return { error: "Download nicht gefunden." };
  }

  await deleteBlobs([download.fileKey]);
  await prisma.download.delete({ where: { id } });

  revalidateDownloadPaths();
  return { success: true as const };
}

export type ReplaceDownloadFileInput = {
  fileUrl: string;
  fileType: string;
  fileSizeBytes: number;
  fileName: string;
};

/** Reupload for an existing download (see #115) — replaces the file while
 * keeping id/title/status/order untouched. Bumps `fileUpdatedAt` explicitly
 * since it tracks the file content, not the row (see #201) — `updatedAt`
 * ticks automatically but also on unrelated changes like rename/status.
 * Deletes the old blob only after the database row points at the new one,
 * so a failed upload never orphans the row without a file, and a failed
 * delete never loses the new file. */
export async function replaceDownloadFile(
  id: string,
  input: ReplaceDownloadFileInput,
) {
  const forbidden = await actionPermissionDenied("downloads:manage");
  if (forbidden) return forbidden;

  const existing = await prisma.download.findUnique({
    where: { id },
    select: { fileKey: true },
  });
  if (!existing) {
    return { error: "Download nicht gefunden." };
  }

  await prisma.download.update({
    where: { id },
    data: { ...toDownloadFileData(input), fileUpdatedAt: new Date() },
  });
  await deleteBlobs([existing.fileKey]);

  revalidateDownloadPaths();
  return { success: true as const };
}

/** Manual reorder for the main list (see #113). OFFLINE downloads have no
 * manual order (they sort by `fileUpdatedAt`, see #201), so any OFFLINE id
 * is dropped rather than reordered. */
export async function reorderDownloads(orderedIds: string[]) {
  const forbidden = await actionPermissionDenied("downloads:manage");
  if (forbidden) return forbidden;

  const downloads = await prisma.download.findMany({
    where: { id: { in: orderedIds } },
    select: { id: true, status: true },
  });
  const reorderableIds = new Set(
    downloads.filter((d) => d.status !== "OFFLINE").map((d) => d.id),
  );
  const reorderedIds = orderedIds.filter((id) => reorderableIds.has(id));

  await prisma.$transaction(
    reorderedIds.map((id, index) =>
      prisma.download.update({ where: { id }, data: { order: index } }),
    ),
  );

  revalidateDownloadPaths();
  return { success: true as const };
}

export async function getDownloadUploadToken(
  pathname: string,
  contentType: string,
) {
  const forbidden = await actionPermissionDenied("downloads:manage");
  if (forbidden) throw new Error(forbidden.error);

  return createBlobUploadToken({
    pathname: normaliseBlobPath(pathname, "downloads"),
    contentType,
    addRandomSuffix: true,
    maximumSizeInBytes: MAX_UPLOAD_BYTES,
  });
}
