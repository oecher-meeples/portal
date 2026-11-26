import { prisma } from "@/lib/utils/prisma";
import { deleteBlobs } from "@/lib/utils/blob-delete";

export type HelperRoleGuideResult = { error: string } | { success: true };

export type HelperRoleGuideFile = {
  /** Objekt-Key unter `downloads/` (bereits via `toStoredBlobRef` geprüft). */
  fileKey: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
};

/**
 * Anleitung (PDF) einer Helferrolle (#672) — bewusst derselbe `Download`-
 * Datensatz wie auf /downloads (Status INTERNAL), keine zweite Datei- und
 * Löschlogik. Erstupload legt den Download an, ein weiterer ersetzt dessen
 * Datei und löscht das alte Blob erst, nachdem die Zeile auf das neue zeigt.
 * Does not check permissions — that is the caller's job.
 */
export async function setHelperRoleGuide(
  roleId: string,
  file: HelperRoleGuideFile,
): Promise<HelperRoleGuideResult> {
  const role = await prisma.helperRole.findUnique({
    where: { id: roleId },
    select: {
      name: true,
      guideDownload: { select: { id: true, fileKey: true } },
    },
  });
  if (!role) return { error: "Helferrolle nicht gefunden." };

  if (!role.guideDownload) {
    await prisma.helperRole.update({
      where: { id: roleId },
      data: {
        guideDownload: {
          create: {
            title: `Anleitung ${role.name}`,
            status: "INTERNAL",
            ...file,
          },
        },
      },
    });
    return { success: true };
  }

  await prisma.download.update({
    where: { id: role.guideDownload.id },
    data: { ...file, fileUpdatedAt: new Date() },
  });
  if (role.guideDownload.fileKey !== file.fileKey) {
    await deleteBlobs([role.guideDownload.fileKey]);
  }
  return { success: true };
}

/** Löscht Download und Blob; die FK setzt `guideDownloadId` auf `null`.
 * Does not check permissions — that is the caller's job. */
export async function removeHelperRoleGuide(
  roleId: string,
): Promise<HelperRoleGuideResult> {
  const role = await prisma.helperRole.findUnique({
    where: { id: roleId },
    select: { guideDownload: { select: { id: true, fileKey: true } } },
  });
  if (!role) return { error: "Helferrolle nicht gefunden." };
  if (!role.guideDownload) return { success: true };

  await prisma.download.delete({ where: { id: role.guideDownload.id } });
  await deleteBlobs([role.guideDownload.fileKey]);
  return { success: true };
}
