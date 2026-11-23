"use client";

import { useState } from "react";
import { TextField } from "@/components/ui/field";
import { FileField } from "@/components/ui/file-field";
import { Button } from "@/components/ui/button";
import { useBlobUpload } from "@/lib/utils/use-blob-upload";
import { useAction } from "@/components/ui/use-action";
import {
  createDownload,
  getDownloadUploadToken,
} from "@/lib/downloads/actions";

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

export function DownloadUploadForm() {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const {
    uploadFiles,
    isUploading,
    error: uploadError,
  } = useBlobUpload("downloads", getDownloadUploadToken);
  const { run, pending, error } = useAction({
    onSuccess: () => {
      setTitle("");
      setFile(null);
      setResetKey((key) => key + 1);
    },
  });

  const canSubmit = Boolean(title.trim() && file) && !isUploading && !pending;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return;

    const fileType = resolveFileType(file);

    const [fileUrl] = await uploadFiles([file]);
    if (!fileUrl) return;

    await run(() =>
      createDownload({
        title: title.trim(),
        fileName: file.name,
        fileUrl,
        fileType,
        fileSizeBytes: file.size,
      }),
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <TextField
            id="download-upload-title"
            label="Titel"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </div>
        <FileField
          key={resetKey}
          id="download-upload-file"
          label="Datei"
          onFilesSelected={(files) => setFile(files[0] ?? null)}
        />
        <Button type="submit" variant="outline" disabled={!canSubmit}>
          {isUploading || pending ? "Lade hoch…" : "Hochladen"}
        </Button>
      </div>
      {(uploadError || error) && (
        <p className="text-destructive text-sm">{uploadError || error}</p>
      )}
    </form>
  );
}
