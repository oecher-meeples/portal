"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileField } from "@/components/ui/file-field";
import { Textarea } from "@/components/ui/textarea";
import { CoverMedia } from "@/components/ui/cover-media";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { useBlobUpload } from "@/lib/utils/use-blob-upload";
import { compressImage } from "@/lib/utils/compress-image";
import { getUploadToken } from "@/components/feature/admin-news/actions";

/**
 * Abschnitte von `post-form.tsx` mit eigenem UI-Zustand (#524): der Markdown-
 * Inhalt mit Editor/Vorschau-Umschalter und das Cover-Bild mit Upload. Das
 * Formular hält nur noch die Werte, nicht deren Bearbeitungszustand.
 */

export function PostBodyField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"editor" | "preview">("editor");

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label htmlFor="body">Inhalt (Markdown)</Label>
          <a
            href="https://de.wikipedia.org/wiki/Markdown"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground text-xs underline underline-offset-2"
          >
            Was ist Markdown?
          </a>
        </div>
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant={activeTab === "editor" ? "default" : "outline"}
            onClick={() => setActiveTab("editor")}
          >
            Editor
          </Button>
          <Button
            type="button"
            size="sm"
            variant={activeTab === "preview" ? "default" : "outline"}
            onClick={() => setActiveTab("preview")}
          >
            Vorschau
          </Button>
        </div>
      </div>
      {activeTab === "editor" ? (
        <Textarea
          id="body"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={12}
          className="font-mono text-sm"
          required
        />
      ) : (
        <MarkdownContent
          body={value || "*Keine Vorschau*"}
          className="min-h-64 rounded-md border p-4 text-sm"
        />
      )}
    </div>
  );
}

export function PostCoverField({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const { uploadFiles, isUploading, error } = useBlobUpload(
    "instagram-covers",
    getUploadToken,
  );

  async function handleFiles(files: File[]) {
    const file = files[0];
    if (!file) return;

    const compressed = await compressImage(file);
    const [url] = await uploadFiles([compressed]);
    if (url) onChange(url);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <FileField
        id="coverImage"
        label="Cover-Bild"
        accept="image/png,image/jpeg,image/webp"
        disabled={isUploading}
        onFilesSelected={(files) => void handleFiles(files)}
      />
      {isUploading && (
        <p className="text-muted-foreground text-sm">Lade Bild hoch…</p>
      )}
      {error && <p className="text-destructive text-sm">{error}</p>}
      {value && !isUploading && (
        <CoverMedia
          imageUrl={value}
          alt="Cover-Bild-Vorschau"
          aspect="aspect-square"
          className="w-32"
        />
      )}
    </div>
  );
}
