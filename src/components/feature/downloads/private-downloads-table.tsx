import { DownloadRow } from "@/components/feature/downloads/download-row";
import type { DownloadListItem } from "@/components/feature/downloads/downloads-view";

/** OFFLINE downloads only visible to managers, sorted by `updatedAt desc`
 * (see #113, #116) — no drag handle since there is no manual order here. */
export function PrivateDownloadsTable({
  downloads,
}: {
  downloads: DownloadListItem[];
}) {
  if (downloads.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-serif text-lg font-bold">Private Downloads</h2>
      <p className="text-muted-foreground text-sm">
        Nur für Administratoren sichtbar — sortiert nach letzter Änderung.
      </p>
      <div className="bg-card flex flex-col divide-y rounded-lg border">
        {downloads.map((file) => (
          <DownloadRow key={file.id} file={file} canManage draggable={false} />
        ))}
      </div>
    </div>
  );
}
