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
import { formatDateTime } from "@/lib/utils/format";
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
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {draggable && (
            <GripVertical
              className="text-muted-foreground size-4 shrink-0 cursor-grab"
              aria-hidden
            />
          )}
          {file.fileType === "XLSX" ? (
            <FileSpreadsheet className="size-5 text-emerald-600" />
          ) : (
            <FileText className="text-muted-foreground size-5" />
          )}
          <div>
            {isRenaming ? (
              <form
                onSubmit={handleRenameSubmit}
                className="flex items-center gap-1.5"
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
              <div className="flex items-center gap-1.5">
                <p className="font-medium">{file.title}</p>
                {file.status === "INTERNAL" && (
                  <InternalOnlyBadge tooltip="Nur für Mitglieder" />
                )}
              </div>
            )}
            <p className="text-muted-foreground text-xs">
              {canManage && <>{file.fileName} · </>}
              {file.fileType} · {file.fileSizeFormatted} · Geändert am{" "}
              {formatDateTime(file.updatedAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
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
