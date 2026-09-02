"use client";

import { useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { FileField } from "@/components/ui/file-field";
import { useAction } from "@/components/ui/use-action";
import { useBlobUpload } from "@/lib/utils/use-blob-upload";
import {
  createLfgAttachment,
  deleteLfgAttachment,
  getLfgAttachmentUploadToken,
} from "@/components/feature/lfg/attachment-actions";

export type LfgAttachmentRow = {
  id: string;
  url: string;
  filename: string;
  uploadedByName: string;
  /** Wer hochgeladen hat, plus immer der Ersteller (#283) — serverseitig
   * entschieden, hier nur gerendert. */
  canDelete: boolean;
};

/**
 * Upload-/Download-Bereich auf der LFG-Detailseite (#283) — nur gerendert,
 * solange `isLfgAttachmentEligible()` zutrifft (Termin heute oder in der
 * Vergangenheit) und der Betrachter Teilnehmer ist; beides serverseitig in
 * `[id]/page.tsx` entschieden.
 */
export function LfgAttachmentsSection({
  postId,
  attachments,
}: {
  postId: string;
  attachments: LfgAttachmentRow[];
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [resetKey, setResetKey] = useState(0);
  const {
    uploadFiles,
    isUploading,
    error: uploadError,
  } = useBlobUpload("lfg-attachments", (pathname) =>
    getLfgAttachmentUploadToken(postId, pathname),
  );
  const { run, pending, error } = useAction({
    onSuccess: () => {
      setFiles([]);
      setResetKey((key) => key + 1);
    },
  });

  async function handleUpload() {
    if (files.length === 0) return;
    const urls = await uploadFiles(files);
    for (const [index, url] of urls.entries()) {
      await run(() => createLfgAttachment(postId, url, files[index].name));
    }
  }

  return (
    <div className="bg-card flex flex-col gap-3 rounded-lg border p-5">
      <h2 className="font-serif text-lg font-bold">
        Dateien ({attachments.length})
      </h2>
      {attachments.length === 0 ? (
        <p className="text-muted-foreground text-sm">Noch keine Dateien.</p>
      ) : (
        <ul className="flex flex-col divide-y text-sm">
          {attachments.map((attachment) => (
            <li key={attachment.id} className="flex items-center gap-2.5 py-2">
              <a
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary flex items-center gap-1.5"
              >
                <Download className="size-4" />
                {attachment.filename}
              </a>
              <span className="text-muted-foreground text-xs">
                von {attachment.uploadedByName}
              </span>
              {attachment.canDelete && (
                <ActionButton
                  variant="destructive"
                  size="icon-xs"
                  className="ml-auto"
                  action={deleteLfgAttachment.bind(null, attachment.id)}
                  aria-label={`"${attachment.filename}" löschen`}
                >
                  <Trash2 className="size-3.5" />
                </ActionButton>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <FileField
          key={resetKey}
          id="lfg-attachment-file"
          label="Datei hochladen"
          multiple
          disabled={isUploading || pending}
          onFilesSelected={setFiles}
        />
        <Button
          type="button"
          variant="outline"
          disabled={files.length === 0 || isUploading || pending}
          onClick={handleUpload}
        >
          {isUploading || pending ? "Lade hoch…" : "Hochladen"}
        </Button>
      </div>
      {(uploadError || error) && (
        <p className="text-destructive text-sm">{uploadError || error}</p>
      )}
    </div>
  );
}
