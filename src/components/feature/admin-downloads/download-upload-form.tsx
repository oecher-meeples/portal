"use client";

import { useState } from "react";
import { TextField } from "@/components/ui/field";
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

export function DownloadUploadForm() {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const {
    uploadFiles,
    isUploading,
    error: uploadError,
  } = useBlobUpload("downloads", getDownloadUploadToken);
  const { run, pending, error } = useAction({
    onSuccess: () => {
      setTitle("");
      setFile(null);
    },
  });

  const canSubmit = Boolean(title.trim() && file) && !isUploading && !pending;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return;

    const fileType = FILE_TYPE_BY_MIME[file.type];
    if (!fileType) return;

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
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-3">
      <TextField
        id="download-upload-title"
        label="Titel"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        required
      />
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" htmlFor="download-upload-file">
          Datei (PDF oder XLSX)
        </label>
        <input
          id="download-upload-file"
          type="file"
          accept="application/pdf,.xlsx"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
      </div>
      {(uploadError || error) && (
        <p className="text-destructive text-sm">{uploadError || error}</p>
      )}
      <Button type="submit" disabled={!canSubmit}>
        {isUploading || pending ? "Lade hoch…" : "Hochladen"}
      </Button>
    </form>
  );
}
