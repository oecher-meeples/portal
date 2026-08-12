import Link from "next/link";
import { FileText, FileSpreadsheet } from "lucide-react";
import type { DownloadStatus } from "@prisma/client";
import { PageHeading } from "@/components/ui/page-heading";
import { Button } from "@/components/ui/button";
import { DownloadInternalBadge } from "@/components/entities/download-internal-badge";
import type { LegalDoc } from "@/data/downloads";

export type DownloadListItem = {
  id: string;
  title: string;
  fileName: string;
  fileType: string;
  fileSizeFormatted: string;
  fileUrl: string;
  status: DownloadStatus;
  order: number;
};

type DownloadsViewProps = {
  downloads: DownloadListItem[];
  legalDocs: LegalDoc[];
  canManage: boolean;
};

export function DownloadsView({
  downloads,
  legalDocs,
  canManage,
}: DownloadsViewProps) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Formales"
        title="Downloads & Rechtliches"
        description="Anträge, Satzung und rechtliche Dokumente zum direkten Abruf."
      />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-card flex flex-col divide-y rounded-lg border">
          {downloads.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between gap-4 p-4"
            >
              <div className="flex items-center gap-3">
                {file.fileType === "XLSX" ? (
                  <FileSpreadsheet className="size-5 text-emerald-600" />
                ) : (
                  <FileText className="text-muted-foreground size-5" />
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium">{file.title}</p>
                    <DownloadInternalBadge status={file.status} />
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {canManage && <>{file.fileName} · </>}
                    {file.fileType} · {file.fileSizeFormatted}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                render={
                  <a href={file.fileUrl} download>
                    Download
                  </a>
                }
              />
            </div>
          ))}
        </div>

        <div className="bg-card flex flex-col divide-y rounded-lg border">
          {legalDocs.map((doc) => (
            <div
              key={doc.slug}
              className="flex items-center justify-between gap-4 p-4"
            >
              <p className="font-medium">{doc.title}</p>
              <Button
                variant="outline"
                size="sm"
                render={
                  <Link href={`/rechtliches/${doc.slug}`}>Ansehen →</Link>
                }
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
