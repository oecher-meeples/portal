import { requirePermission } from "@/lib/auth/permissions";
import {
  listAllDownloadsForAdmin,
  formatFileSize,
} from "@/lib/downloads/downloads";
import { AdminDownloadsView } from "@/components/feature/admin-downloads/admin-downloads-view";

export default async function AdminDownloadsPage() {
  await requirePermission("downloads:manage");

  const downloads = await listAllDownloadsForAdmin();

  return (
    <AdminDownloadsView
      downloads={downloads.map((download) => ({
        id: download.id,
        title: download.title,
        fileType: download.fileType,
        fileSizeFormatted: formatFileSize(download.fileSizeBytes),
        status: download.status,
      }))}
    />
  );
}
