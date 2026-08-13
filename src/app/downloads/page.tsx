import type { DownloadStatus } from "@prisma/client";
import { getSessionTier, hasPermissionInCurrentView } from "@/lib/auth/session";
import { getCurrentUser } from "@/lib/auth/server";
import {
  listVisibleDownloads,
  listOfflineDownloadsForAdmin,
  formatFileSize,
} from "@/lib/downloads/downloads";
import { listAllLegalDocuments } from "@/lib/legal/legal";
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
  const [tier, user] = await Promise.all([getSessionTier(), getCurrentUser()]);
  const canManage =
    !!user && (await hasPermissionInCurrentView(user.id, "downloads:manage"));
  const canManageLegal =
    !!user && (await hasPermissionInCurrentView(user.id, "legal:manage"));
  const [downloads, offlineDownloads, legalDocs] = await Promise.all([
    listVisibleDownloads(tier),
    canManage ? listOfflineDownloadsForAdmin() : Promise.resolve([]),
    listAllLegalDocuments(),
  ]);

  return (
    <DownloadsView
      downloads={downloads.map(toDownloadListItem)}
      offlineDownloads={offlineDownloads.map(toDownloadListItem)}
      legalDocs={legalDocs.map((doc) => ({
        slug: doc.slug,
        title: doc.title,
        pdfFileUrl: doc.pdfFileUrl,
      }))}
      canManage={canManage}
      canManageLegal={canManageLegal}
      isMember={tier !== "gast"}
    />
  );
}
