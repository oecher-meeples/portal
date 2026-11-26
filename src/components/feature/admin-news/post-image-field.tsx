"use client";

import { useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  POST_IMAGE_CONTENT_TYPES,
  POST_IMAGE_MAX_BYTES,
  altTextFromFilename,
  postImageMarkdown,
} from "@/lib/content/post-images";
import { compressImage } from "@/lib/utils/compress-image";
import { useBlobUpload } from "@/lib/utils/use-blob-upload";
import {
  getPostImageUploadToken,
  registerPostImage,
} from "@/components/feature/admin-news/post-image-actions";

/** Fügt `text` an der Cursor-Position (bzw. ersetzt die Auswahl) ein. */
export function insertAtSelection(
  value: string,
  start: number,
  end: number,
  text: string,
) {
  return value.slice(0, start) + text + value.slice(end);
}

/**
 * „Bild einfügen" für den Beitrags-Editor (#671): komprimiert, lädt hoch,
 * registriert das Bild und fügt `![Alt](/api/blog-images/<id>)` an der
 * Cursor-Position der Textarea ein.
 */
export function PostImageInsertButton({
  textareaRef,
  onChange,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onChange: (value: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const { uploadFiles, isUploading, error } = useBlobUpload(
    "blog-images",
    getPostImageUploadToken,
  );

  async function handleFile(file: File) {
    setLocalError(null);
    if (!POST_IMAGE_CONTENT_TYPES.includes(file.type)) {
      setLocalError("Nur PNG-, JPEG- und WebP-Bilder sind erlaubt.");
      return;
    }
    const compressed = await compressImage(file);
    if (compressed.size > POST_IMAGE_MAX_BYTES) {
      setLocalError("Das Bild ist größer als 10 MB.");
      return;
    }
    const [url] = await uploadFiles([compressed]);
    if (!url) return;

    const result = await registerPostImage(url);
    if (!result.success) {
      setLocalError(result.error ?? "Bild konnte nicht gespeichert werden.");
      return;
    }

    const textarea = textareaRef.current;
    if (!textarea) return;
    const markdown = postImageMarkdown(
      altTextFromFilename(file.name),
      result.id,
    );
    onChange(
      insertAtSelection(
        textarea.value,
        textarea.selectionStart,
        textarea.selectionEnd,
        markdown,
      ),
    );
  }

  const message = localError ?? error;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus className="size-4" />
          Bild einfügen
        </Button>
        {isUploading && (
          <span className="text-muted-foreground text-sm">Lade Bild hoch…</span>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={POST_IMAGE_CONTENT_TYPES.join(",")}
        aria-label="Bild für den Beitrag auswählen"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void handleFile(file);
        }}
      />
      {message && <p className="text-destructive text-sm">{message}</p>}
    </div>
  );
}
