"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileField } from "@/components/ui/file-field";
import { useAction } from "@/components/ui/use-action";
import { useBlobUpload } from "@/lib/utils/use-blob-upload";
import {
  getHelperRoleGuideUploadToken,
  removeHelperRoleGuideAction,
  setHelperRoleGuideAction,
} from "@/components/feature/admin-events/helper-role-actions";

/** PDF-Anleitung einer Helferrolle (#672): hochladen, ersetzen, entfernen.
 * Wirkt sofort (eigene Actions), unabhängig vom Speichern-Button des
 * Dialogs — die Datei hängt an der bestehenden Rolle. */
export function HelperRoleGuideField({
  roleId,
  guideFileName,
}: {
  roleId: string;
  guideFileName: string | null;
}) {
  const {
    uploadFiles,
    isUploading,
    error: uploadError,
  } = useBlobUpload("downloads", getHelperRoleGuideUploadToken);
  const { run, pending, error } = useAction();

  async function handleSelected(files: File[]) {
    const file = files[0];
    if (!file) return;

    const [fileUrl] = await uploadFiles([file]);
    if (!fileUrl) return;

    await run(() =>
      setHelperRoleGuideAction(roleId, {
        fileUrl,
        fileName: file.name,
        fileSizeBytes: file.size,
      }),
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-3">
        <FileField
          id={`helper-role-guide-${roleId}`}
          label="Anleitung (PDF)"
          hint={
            guideFileName
              ? `Aktuell: ${guideFileName} — erscheint auch unter Downloads (intern).`
              : "Optional. Erscheint auch unter Downloads (intern)."
          }
          accept="application/pdf"
          disabled={isUploading || pending}
          onFilesSelected={handleSelected}
        />
        {guideFileName && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading || pending}
            onClick={() => run(() => removeHelperRoleGuideAction(roleId))}
          >
            <Trash2 />
            Entfernen
          </Button>
        )}
      </div>
      {(uploadError || error) && (
        <p className="text-destructive text-sm">{uploadError || error}</p>
      )}
    </div>
  );
}
