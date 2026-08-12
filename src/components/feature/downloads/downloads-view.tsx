"use client";

import Link from "next/link";
import { useState } from "react";
import type { DownloadStatus } from "@prisma/client";
import { PageHeading } from "@/components/ui/page-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAction } from "@/components/ui/use-action";
import { reorderDownloads } from "@/lib/downloads/actions";
import { DownloadRow } from "@/components/feature/downloads/download-row";
import { DownloadUploadForm } from "@/components/feature/downloads/download-upload-form";
import { PrivateDownloadsTable } from "@/components/feature/downloads/private-downloads-table";
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
  offlineDownloads: DownloadListItem[];
  legalDocs: LegalDoc[];
  canManage: boolean;
};

export function DownloadsView({
  downloads,
  offlineDownloads,
  legalDocs,
  canManage,
}: DownloadsViewProps) {
  const [prevDownloads, setPrevDownloads] = useState(downloads);
  const [items, setItems] = useState(downloads);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const { run, error } = useAction({ refresh: false });

  // Keep in sync when the server payload changes (e.g. after a status
  // change or upload elsewhere on the page triggers a refresh) — adjusting
  // state during render instead of an effect avoids the extra commit.
  if (downloads !== prevDownloads) {
    setPrevDownloads(downloads);
    setItems(downloads);
  }

  async function moveAndPersist(targetId: string) {
    if (!draggedId || draggedId === targetId) return;
    const previous = items;

    const next = [...items];
    const fromIndex = next.findIndex((item) => item.id === draggedId);
    const toIndex = next.findIndex((item) => item.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);

    setItems(next);
    setDraggedId(null);

    const ok = await run(() => reorderDownloads(next.map((item) => item.id)));
    if (!ok) setItems(previous);
  }

  const visibleItems = items.filter((item) =>
    item.title.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Formales"
        title="Downloads & Rechtliches"
        description="Anträge, Satzung und rechtliche Dokumente zum direkten Abruf."
      />
      {canManage && (
        <div className="bg-muted/30 rounded-lg border p-4">
          <DownloadUploadForm />
        </div>
      )}
      <Input
        type="search"
        placeholder="Nach Titel suchen…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="max-w-sm"
        aria-label="Downloads durchsuchen"
      />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <div className="bg-card flex flex-col divide-y rounded-lg border">
            {visibleItems.map((file) => (
              <DownloadRow
                key={file.id}
                file={file}
                canManage={canManage}
                draggable={canManage}
                onDragStart={() => setDraggedId(file.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => moveAndPersist(file.id)}
              />
            ))}
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
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
      {canManage && <PrivateDownloadsTable downloads={offlineDownloads} />}
    </div>
  );
}
