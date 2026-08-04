"use server";

import { revalidatePath } from "next/cache";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import type { DownloadStatus } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import { getCurrentUser } from "@/lib/auth/server";
import { hasPermission } from "@/lib/auth/permissions";
import { normaliseBlobPath } from "@/lib/utils/blob-path";
import { deleteBlobs } from "@/lib/utils/blob-delete";

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

const ALLOWED_CONTENT_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

async function requireManagePermission() {
  const user = await getCurrentUser();
  if (!user || !(await hasPermission(user.id, "downloads:manage"))) {
    return { error: "Keine Berechtigung." } as const;
  }
  return null;
}

function revalidateDownloadPaths() {
  revalidatePath("/downloads");
  revalidatePath("/admin/downloads");
}

export type CreateDownloadInput = {
  title: string;
  fileUrl: string;
  fileType: string;
  fileSizeBytes: number;
};

export async function createDownload(input: CreateDownloadInput) {
  const forbidden = await requireManagePermission();
  if (forbidden) return forbidden;

  await prisma.download.create({ data: input });

  revalidateDownloadPaths();
  return { success: true as const };
}

export async function setDownloadStatus(id: string, status: DownloadStatus) {
  const forbidden = await requireManagePermission();
  if (forbidden) return forbidden;

  await prisma.download.update({ where: { id }, data: { status } });

  revalidateDownloadPaths();
  return { success: true as const };
}

export async function deleteDownload(id: string) {
  const forbidden = await requireManagePermission();
  if (forbidden) return forbidden;

  const download = await prisma.download.findUnique({
    where: { id },
    select: { fileUrl: true },
  });
  if (!download) {
    return { error: "Download nicht gefunden." };
  }

  await deleteBlobs([download.fileUrl]);
  await prisma.download.delete({ where: { id } });

  revalidateDownloadPaths();
  return { success: true as const };
}

export async function getDownloadUploadToken(pathname: string) {
  const forbidden = await requireManagePermission();
  if (forbidden) throw new Error(forbidden.error);

  return generateClientTokenFromReadWriteToken({
    pathname: normaliseBlobPath(pathname, "downloads"),
    allowedContentTypes: ALLOWED_CONTENT_TYPES,
    addRandomSuffix: true,
    maximumSizeInBytes: MAX_UPLOAD_BYTES,
  });
}
