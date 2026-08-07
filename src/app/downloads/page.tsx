import { LEGAL_DOCS } from "@/data/downloads";
import { getSessionTier } from "@/lib/auth/session";
import {
  listVisibleDownloads,
  formatFileSize,
} from "@/lib/downloads/downloads";
import { DownloadsView } from "@/components/feature/downloads/downloads-view";

export default async function DownloadsPage() {
  const tier = await getSessionTier();
  const downloads = await listVisibleDownloads(tier);

  return (
    <DownloadsView
      downloads={downloads.map((download) => ({
        id: download.id,
        title: download.title,
        fileType: download.fileType,
        fileSizeFormatted: formatFileSize(download.fileSizeBytes),
        fileUrl: download.fileUrl,
      }))}
      legalDocs={LEGAL_DOCS}
    />
  );
}
