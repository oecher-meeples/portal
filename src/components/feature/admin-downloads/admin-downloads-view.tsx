import type { DownloadStatus } from "@prisma/client";
import { PageHeading } from "@/components/ui/page-heading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ActionButton } from "@/components/ui/action-button";
import { DownloadStatusPill } from "@/components/entities/download-status-pill";
import { DOWNLOAD_STATUS_LABELS } from "@/lib/downloads/labels";
import { setDownloadStatus, deleteDownload } from "@/lib/downloads/actions";
import { DownloadUploadForm } from "@/components/feature/admin-downloads/download-upload-form";

export type DownloadRow = {
  id: string;
  title: string;
  fileType: string;
  fileSizeFormatted: string;
  status: DownloadStatus;
};

const STATUS_OPTIONS: DownloadStatus[] = ["PUBLIC", "INTERNAL", "OFFLINE"];

export function AdminDownloadsView({
  downloads,
}: {
  downloads: DownloadRow[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Downloads & Rechtliches"
        title="Downloads verwalten"
        description="Neue Downloads hochladen und die Sichtbarkeit bestehender Downloads ändern oder sie entfernen."
      />

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Titel</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Größe</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right"> </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {downloads.map((download) => (
              <TableRow key={download.id}>
                <TableCell className="font-medium">
                  {download.title}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {download.fileType}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {download.fileSizeFormatted}
                </TableCell>
                <TableCell>
                  <DownloadStatusPill status={download.status} />
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {STATUS_OPTIONS.filter(
                      (status) => status !== download.status,
                    ).map((status) => (
                      <ActionButton
                        key={status}
                        variant="ghost"
                        size="sm"
                        action={setDownloadStatus.bind(
                          null,
                          download.id,
                          status,
                        )}
                        pendingLabel="…"
                      >
                        {DOWNLOAD_STATUS_LABELS[status]}
                      </ActionButton>
                    ))}
                    <ActionButton
                      variant="destructive"
                      size="sm"
                      confirm={`"${download.title}" wirklich unwiderruflich löschen?`}
                      action={deleteDownload.bind(null, download.id)}
                      pendingLabel="Lösche…"
                    >
                      Löschen
                    </ActionButton>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div>
        <h2 className="font-serif text-lg font-bold">Neuer Download</h2>
        <div className="mt-3">
          <DownloadUploadForm />
        </div>
      </div>
    </div>
  );
}
