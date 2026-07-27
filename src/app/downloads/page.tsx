import Link from "next/link";
import { FileText, FileSpreadsheet } from "lucide-react";
import { PageHeading } from "@/components/shared/page-heading";
import { Button } from "@/components/ui/button";
import { DOWNLOADS, LEGAL_DOCS } from "@/data/downloads";

export default function DownloadsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Formales"
        title="Downloads & Rechtliches"
        description="Anträge, Satzung und rechtliche Dokumente zum direkten Abruf."
      />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col divide-y rounded-lg border bg-card">
          {DOWNLOADS.map((file) => (
            <div key={file.title} className="flex items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-3">
                {file.filetype === "XLSX" ? (
                  <FileSpreadsheet className="size-5 text-emerald-600" />
                ) : (
                  <FileText className="size-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">{file.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {file.filetype} · {file.size}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Download
              </Button>
            </div>
          ))}
        </div>

        <div className="flex flex-col divide-y rounded-lg border bg-card">
          {LEGAL_DOCS.map((doc) => (
            <div key={doc.slug} className="flex items-center justify-between gap-4 p-4">
              <p className="font-medium">{doc.title}</p>
              <Button
                variant="outline"
                size="sm"
                render={<Link href={`/rechtliches/${doc.slug}`}>Ansehen →</Link>}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
