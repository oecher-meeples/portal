"use server";

import { revalidatePath } from "next/cache";
import { requireActionPermission } from "@/lib/auth/action-guards";
import {
  createHelperRole,
  updateHelperRole,
  deleteHelperRole,
} from "@/lib/events/helper-roles";
import {
  setHelperRoleGuide,
  removeHelperRoleGuide,
} from "@/lib/events/helper-role-guide";
import { normaliseBlobPath } from "@/lib/utils/blob-path";
import { createBlobUploadToken } from "@/lib/utils/blob-upload-token";
import { toStoredBlobRef } from "@/lib/utils/blob-access";

export async function createHelperRoleAction(
  name: string,
  grantsPermissionKey: string | null,
  hasShifts: boolean,
) {
  await requireActionPermission("events:manage");

  const result = await createHelperRole(name, grantsPermissionKey, hasShifts);
  if ("error" in result) return result;

  revalidatePath("/admin/events");
  return { success: true as const };
}

export async function updateHelperRoleAction(
  roleId: string,
  name: string,
  grantsPermissionKey: string | null,
  hasShifts: boolean,
) {
  await requireActionPermission("events:manage");

  const result = await updateHelperRole(
    roleId,
    name,
    grantsPermissionKey,
    hasShifts,
  );
  if ("error" in result) return result;

  revalidatePath("/admin/events");
  return { success: true as const };
}

export async function deleteHelperRoleAction(roleId: string) {
  await requireActionPermission("events:manage");

  const result = await deleteHelperRole(roleId);
  if ("error" in result) return result;

  revalidatePath("/admin/events");
  return { success: true as const };
}

const MAX_GUIDE_BYTES = 20 * 1024 * 1024;

/** Upload-Token für die Anleitung (#672) — nur PDF, im `downloads/`-Präfix,
 * weil die Datei als internes `Download` auch auf /downloads erscheint. */
export async function getHelperRoleGuideUploadToken(
  pathname: string,
  contentType: string,
) {
  await requireActionPermission("events:manage");

  return createBlobUploadToken({
    pathname: normaliseBlobPath(pathname, "downloads"),
    contentType,
    allowedContentTypes: ["application/pdf"],
    addRandomSuffix: true,
    maximumSizeInBytes: MAX_GUIDE_BYTES,
  });
}

export async function setHelperRoleGuideAction(
  roleId: string,
  file: { fileUrl: string; fileName: string; fileSizeBytes: number },
) {
  await requireActionPermission("events:manage");

  const result = await setHelperRoleGuide(roleId, {
    fileKey: toStoredBlobRef(file.fileUrl, "downloads"),
    fileName: file.fileName,
    fileType: "PDF",
    fileSizeBytes: file.fileSizeBytes,
  });
  if ("error" in result) return result;

  revalidateGuidePaths();
  return { success: true as const };
}

export async function removeHelperRoleGuideAction(roleId: string) {
  await requireActionPermission("events:manage");

  const result = await removeHelperRoleGuide(roleId);
  if ("error" in result) return result;

  revalidateGuidePaths();
  return { success: true as const };
}

function revalidateGuidePaths() {
  revalidatePath("/admin/events");
  revalidatePath("/downloads");
  revalidatePath("/helfer");
}
