import type { DownloadStatus } from "@prisma/client";
import { LEGAL_DOCS } from "@/data/downloads";
import { getRealSessionTier } from "@/lib/auth/session";
import { getCurrentUser } from "@/lib/auth/server";
import { hasPermission } from "@/lib/auth/permissions";
import {
  listVisibleDownloads,
  listOfflineDownloadsForAdmin,
  formatFileSize,
} from "@/lib/downloads/downloads";
import { DownloadsView } from "@/components/feature/downloads/downloads-view";

function toDownloadListItem(download: {
  id: string;
  title: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  fileUrl: string;
  status: DownloadStatus;
  order: number;
}) {
  return {
    id: download.id,
    title: download.title,
    fileName: download.fileName,
    fileType: download.fileType,
    fileSizeFormatted: formatFileSize(download.fileSizeBytes),
    fileUrl: download.fileUrl,
    status: download.status,
    order: download.order,
  };
}

export default async function DownloadsPage() {
  const [tier, user] = await Promise.all([
    getRealSessionTier(),
    getCurrentUser(),
  ]);
  const canManage =
    !!user && (await hasPermission(user.id, "downloads:manage"));
  const [downloads, offlineDownloads] = await Promise.all([
    listVisibleDownloads(tier),
    canManage ? listOfflineDownloadsForAdmin() : Promise.resolve([]),
  ]);

  return (
    <DownloadsView
      downloads={downloads.map(toDownloadListItem)}
      offlineDownloads={offlineDownloads.map(toDownloadListItem)}
      legalDocs={LEGAL_DOCS}
      canManage={canManage}
    />
  );
}
