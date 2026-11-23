"use client";

import { useRef, useState } from "react";
import {
  Download,
  FileText,
  FileSpreadsheet,
  GripVertical,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InternalOnlyBadge } from "@/components/entities/internal-only-badge";
import { Input } from "@/components/ui/input";
import { useAction } from "@/components/ui/use-action";
import { useBlobUpload } from "@/lib/utils/use-blob-upload";
import { formatDateTime, formatDateMedium } from "@/lib/utils/format";
import { DOWNLOAD_STATUS_LABELS } from "@/lib/downloads/labels";
import {
  renameDownload,
  setDownloadStatus,
  deleteDownload,
  replaceDownloadFile,
  getDownloadUploadToken,
} from "@/lib/downloads/actions";
import type { DownloadListItem } from "@/components/feature/downloads/downloads-view";
import type { DownloadStatus } from "@prisma/client";

const STATUS_OPTIONS: DownloadStatus[] = ["PUBLIC", "INTERNAL", "OFFLINE"];
const FILE_TYPE_BY_MIME: Record<string, string> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
};

function resolveFileType(file: File) {
  return (
    FILE_TYPE_BY_MIME[file.type] ??
    file.name.split(".").pop()?.toUpperCase() ??
    "DATEI"
  );
}

type DownloadRowProps = {
  file: DownloadListItem;
  canManage: boolean;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragOver?: (event: React.DragEvent) => void;
  onDrop?: () => void;
};

/** One row of the downloads list, shared by the main list (draggable) and
 * the private OFFLINE table below it (not draggable, see #116). */
export function DownloadRow({
  file,
  canManage,
  draggable = false,
  onDragStart,
  onDragOver,
  onDrop,
}: DownloadRowProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [titleDraft, setTitleDraft] = useState(file.title);
  const { run: runStatus } = useAction();
  const { run: runDelete, error: deleteError } = useAction();
  const { run: runReplace, error: replaceError } = useAction();
  const { run: runRename, error: renameError } = useAction({
    onSuccess: () => setIsRenaming(false),
  });
  const { uploadFiles, error: uploadError } = useBlobUpload(
    "downloads",
    getDownloadUploadToken,
  );

  function handleRenameSubmit(event: React.FormEvent) {
    event.preventDefault();
    void runRename(() => renameDownload(file.id, titleDraft));
  }

  function cancelRename() {
    setTitleDraft(file.title);
    setIsRenaming(false);
  }

  async function handleReuploadFile(selected: File | null) {
    if (!selected) return;
    const fileType = resolveFileType(selected);

    const [fileUrl] = await uploadFiles([selected]);
    if (!fileUrl) return;

    await runReplace(() =>
      replaceDownloadFile(file.id, {
        fileUrl,
        fileType,
        fileSizeBytes: selected.size,
        fileName: selected.name,
      }),
    );
  }

  function handleDelete() {
    if (!window.confirm(`"${file.title}" wirklich unwiderruflich löschen?`)) {
      return;
    }
    void runDelete(() => deleteDownload(file.id));
  }

  const error = deleteError || replaceError || uploadError || renameError;

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className="flex flex-col gap-1 p-4"
    >
      {/* 3×3-Grid statt weiterer Stack-Verschachtelung: Spalte 1 (Drag-
          Handle) über volle Höhe, Spalte 2 (Icon+Titel/Dateiname/Datum)
          — Titelzeile über beide Content-Spalten (col-span-2, volle
          Breite), die zwei Meta-Zeilen darunter an der Icon-Spalte
          ausgerichtet, Spalte 3 (Menü+Download) nur über die zwei
          Meta-Zeilen zentriert (row-span-2 ab Zeile 2, nicht die Titelzeile). */}
      <div className="grid grid-cols-[auto_1fr_auto] grid-rows-[auto_auto_auto] items-center gap-x-3 gap-y-0.5">
        {draggable && (
          <GripVertical
            className="text-muted-foreground col-start-1 row-span-3 row-start-1 size-4 shrink-0 cursor-grab self-center justify-self-center"
            aria-hidden
          />
        )}
        <div className="col-span-2 col-start-2 row-start-1 flex min-w-0 items-start gap-3">
          {file.fileType === "XLSX" ? (
            <FileSpreadsheet className="size-5 shrink-0 text-emerald-600" />
          ) : (
            <FileText className="text-muted-foreground size-5 shrink-0" />
          )}
          {isRenaming ? (
            <form
              onSubmit={handleRenameSubmit}
              className="flex min-w-0 items-center gap-1.5"
            >
              <Input
                autoFocus
                value={titleDraft}
                onChange={(event) => setTitleDraft(event.target.value)}
                className="h-7 max-w-56"
                aria-label="Titel"
              />
              <Button type="submit" size="sm">
                Speichern
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={cancelRename}
              >
                Abbrechen
              </Button>
            </form>
          ) : (
            <div className="flex min-w-0 items-center gap-1.5">
              <p className="min-w-0 font-medium">
                {file.title} ({file.fileType})
              </p>
              {file.status === "INTERNAL" && (
                <InternalOnlyBadge tooltip="Nur für Mitglieder" />
              )}
            </div>
          )}
        </div>
        {canManage && (
          <p className="text-muted-foreground col-start-2 row-start-2 text-xs">
            {file.fileName} · {file.fileSizeFormatted}
          </p>
        )}
        <p className="text-muted-foreground col-start-2 row-start-3 text-xs">
          Geändert am{" "}
          {canManage
            ? formatDateTime(file.fileUpdatedAt)
            : formatDateMedium(file.fileUpdatedAt)}
        </p>
        <div className="col-start-3 row-span-2 row-start-2 flex items-center gap-1 self-end">
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon-sm">
                    <MoreVertical className="size-4" />
                  </Button>
                }
              />
              <DropdownMenuContent>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Status ändern</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {STATUS_OPTIONS.filter(
                      (status) => status !== file.status,
                    ).map((status) => (
                      <DropdownMenuItem
                        key={status}
                        onClick={() =>
                          void runStatus(() =>
                            setDownloadStatus(file.id, status),
                          )
                        }
                      >
                        {DOWNLOAD_STATUS_LABELS[status]}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem
                  onClick={() => {
                    setTitleDraft(file.title);
                    setIsRenaming(true);
                  }}
                >
                  Umbenennen
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                  Reupload
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                  Löschen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button
            variant="outline"
            size="sm"
            render={
              <a href={file.fileUrl} download>
                <Download className="size-4" />
                Download
              </a>
            }
          />
        </div>
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(event) => {
          void handleReuploadFile(event.target.files?.[0] ?? null);
          event.target.value = "";
        }}
      />
    </div>
  );
}
