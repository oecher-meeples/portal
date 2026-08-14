"use server";

import { revalidatePath } from "next/cache";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { prisma } from "@/lib/utils/prisma";
import { getCurrentUser } from "@/lib/auth/server";
import { hasPermission } from "@/lib/auth/permissions";
import { normaliseBlobPath } from "@/lib/utils/blob-path";
import { deleteBlobs } from "@/lib/utils/blob-delete";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

async function requireManagePermission() {
  const user = await getCurrentUser();
  if (!user || !(await hasPermission(user.id, "links:manage"))) {
    return { error: "Keine Berechtigung." } as const;
  }
  return null;
}

function revalidateLinkPaths() {
  revalidatePath("/dashboard");
}

export type ImportantLinkInput = {
  title: string;
  targetUrl: string;
  iconUrl?: string;
};

export async function createImportantLink(input: ImportantLinkInput) {
  const forbidden = await requireManagePermission();
  if (forbidden) return forbidden;

  await prisma.importantLink.create({ data: input });

  revalidateLinkPaths();
  return { success: true as const };
}

export async function updateImportantLink(
  id: string,
  input: ImportantLinkInput,
) {
  const forbidden = await requireManagePermission();
  if (forbidden) return forbidden;

  await prisma.importantLink.update({ where: { id }, data: input });

  revalidateLinkPaths();
  return { success: true as const };
}

export async function deleteImportantLink(id: string) {
  const forbidden = await requireManagePermission();
  if (forbidden) return forbidden;

  const link = await prisma.importantLink.findUnique({
    where: { id },
    select: { iconUrl: true },
  });
  if (!link) {
    return { error: "Link nicht gefunden." };
  }

  if (link.iconUrl) {
    await deleteBlobs([link.iconUrl]);
  }
  await prisma.importantLink.delete({ where: { id } });

  revalidateLinkPaths();
  return { success: true as const };
}

export async function getImportantLinkUploadToken(pathname: string) {
  const forbidden = await requireManagePermission();
  if (forbidden) throw new Error(forbidden.error);

  return generateClientTokenFromReadWriteToken({
    pathname: normaliseBlobPath(pathname, "important-links"),
    allowedContentTypes: ["image/png", "image/jpeg", "image/webp"],
    addRandomSuffix: true,
    maximumSizeInBytes: MAX_UPLOAD_BYTES,
  });
}
