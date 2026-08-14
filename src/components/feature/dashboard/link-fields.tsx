"use client";

import { TextField } from "@/components/ui/field";
import { FileField } from "@/components/ui/file-field";
import { CoverMedia } from "@/components/ui/cover-media";
import { useBlobUpload } from "@/lib/utils/use-blob-upload";
import { compressImage } from "@/lib/utils/compress-image";
import { getImportantLinkUploadToken } from "@/lib/links/actions";

export function LinkFields({
  title,
  onTitleChange,
  targetUrl,
  onTargetUrlChange,
  iconUrl,
  onIconUrlChange,
}: {
  title: string;
  onTitleChange: (value: string) => void;
  targetUrl: string;
  onTargetUrlChange: (value: string) => void;
  iconUrl: string;
  onIconUrlChange: (url: string) => void;
}) {
  const {
    uploadFiles,
    isUploading,
    error: uploadError,
  } = useBlobUpload("important-links", getImportantLinkUploadToken);

  async function handleIconChange(files: File[]) {
    const file = files[0];
    if (!file) return;

    const compressed = await compressImage(file);
    const [url] = await uploadFiles([compressed]);
    if (url) onIconUrlChange(url);
  }

  return (
    <>
      <TextField
        id="link-title"
        label="Titel"
        value={title}
        onChange={(event) => onTitleChange(event.target.value)}
        required
      />
      <TextField
        id="link-target-url"
        label="Ziel-URL"
        type="url"
        value={targetUrl}
        onChange={(event) => onTargetUrlChange(event.target.value)}
        required
      />
      <div className="flex flex-col gap-1.5">
        <FileField
          id="link-icon"
          label="Icon"
          accept="image/png,image/jpeg,image/webp"
          disabled={isUploading}
          onFilesSelected={(files) => void handleIconChange(files)}
        />
        {isUploading && (
          <p className="text-muted-foreground text-sm">Lade Icon hoch…</p>
        )}
        {uploadError && (
          <p className="text-destructive text-sm">{uploadError}</p>
        )}
        {iconUrl && !isUploading && (
          <CoverMedia
            imageUrl={iconUrl}
            alt="Icon-Vorschau"
            aspect="aspect-square"
            className="w-16"
          />
        )}
      </div>
    </>
  );
}
