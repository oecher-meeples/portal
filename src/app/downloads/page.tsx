import { LEGAL_DOCS } from "@/data/downloads";
import { getSessionTier } from "@/lib/auth/session";
import { getCurrentUser } from "@/lib/auth/server";
import { hasPermission } from "@/lib/auth/permissions";
import {
  listVisibleDownloads,
  formatFileSize,
} from "@/lib/downloads/downloads";
import { DownloadsView } from "@/components/feature/downloads/downloads-view";

export default async function DownloadsPage() {
  const [tier, user] = await Promise.all([
    getSessionTier(),
    getCurrentUser(),
  ]);
  const canManage =
    !!user && (await hasPermission(user.id, "downloads:manage"));
  const downloads = await listVisibleDownloads(tier);

  return (
    <DownloadsView
      downloads={downloads.map((download) => ({
        id: download.id,
        title: download.title,
        fileName: download.fileName,
        fileType: download.fileType,
        fileSizeFormatted: formatFileSize(download.fileSizeBytes),
        fileUrl: download.fileUrl,
        status: download.status,
        order: download.order,
      }))}
      legalDocs={LEGAL_DOCS}
      canManage={canManage}
    />
  );
}
