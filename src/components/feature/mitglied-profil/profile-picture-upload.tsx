"use client";

import { useState } from "react";
import type { ProfilePictureVisibility } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { FileField } from "@/components/ui/file-field";
import { ImageCropDialog } from "@/components/ui/image-crop-dialog";
import { useAction } from "@/components/ui/use-action";
import { useBlobUpload } from "@/lib/utils/use-blob-upload";
import { compressImage } from "@/lib/utils/compress-image";
import { PROFILE_PICTURE_VISIBILITY_LABELS } from "@/lib/members/profile-picture-visibility";
import {
  deleteMeepleProfilePicture,
  getMeepleProfilePictureUploadToken,
  saveMeepleProfilePicture,
  updateMeepleProfilePictureVisibility,
} from "@/components/feature/mitglied-profil/meeple-profile-picture-actions";

/** Profilbild-Upload im Meeple-Daten-Bereich (#389) — nutzt `useBlobUpload`
 * wie im Rest des Repos, kein eigener Upload-State. Ohne `canEdit` nur die
 * Anzeige (kein Formular), damit andere Betrachter:innen kein leeres
 * Upload-Feld sehen. */
export function ProfilePictureUpload({
  meepleId,
  profilePictureUrl,
  visibility,
  canEdit,
}: {
  meepleId: string;
  profilePictureUrl: string | null;
  visibility: ProfilePictureVisibility;
  canEdit: boolean;
}) {
  const [selectedVisibility, setSelectedVisibility] =
    useState<ProfilePictureVisibility>(visibility);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const {
    uploadFiles,
    isUploading,
    error: uploadError,
  } = useBlobUpload("meeple-profile-pictures", (pathname) =>
    getMeepleProfilePictureUploadToken(meepleId, pathname),
  );
  const { run, pending, error } = useAction();

  function handleFiles(files: File[]) {
    const file = files[0];
    if (!file) return;
    setCropFile(file);
  }

  async function handleCropped(file: File) {
    setCropFile(null);
    const compressed = await compressImage(file);
    const [url] = await uploadFiles([compressed]);
    if (!url) return;
    await run(() =>
      saveMeepleProfilePicture(meepleId, url, selectedVisibility),
    );
  }

  async function handleVisibilityChange(next: ProfilePictureVisibility) {
    setSelectedVisibility(next);
    if (profilePictureUrl) {
      await run(() => updateMeepleProfilePictureVisibility(meepleId, next));
    }
  }

  if (!profilePictureUrl && !canEdit) return null;

  return (
    <div className="flex flex-col gap-2 border-t pt-4">
      <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
        Profilbild
      </span>
      <div className="flex items-center gap-3">
        {profilePictureUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- Blob-URL, kein next/image nötig für ein Avatar
          <img
            src={profilePictureUrl}
            alt=""
            className="size-16 shrink-0 rounded-full object-cover"
          />
        )}
        {canEdit && (
          <FileField
            id="meeple-profile-picture"
            label="Neues Bild hochladen"
            accept="image/png,image/jpeg,image/webp"
            onFilesSelected={handleFiles}
            disabled={isUploading || pending}
          />
        )}
      </div>

      {canEdit && (
        <>
          <select
            value={selectedVisibility}
            onChange={(event) =>
              handleVisibilityChange(
                event.target.value as ProfilePictureVisibility,
              )
            }
            className="border-input bg-background h-9 w-fit rounded-md border px-3 text-sm"
          >
            {Object.entries(PROFILE_PICTURE_VISIBILITY_LABELS).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ),
            )}
          </select>

          {profilePictureUrl && (
            <Button
              variant="outline"
              size="sm"
              className="w-fit"
              disabled={pending}
              onClick={() => run(() => deleteMeepleProfilePicture(meepleId))}
            >
              Profilbild entfernen
            </Button>
          )}
        </>
      )}

      {(uploadError || error) && (
        <p className="text-destructive text-sm">{uploadError ?? error}</p>
      )}

      <ImageCropDialog
        open={cropFile !== null}
        onOpenChange={(open) => {
          if (!open) setCropFile(null);
        }}
        file={cropFile}
        onCropped={(file) => void handleCropped(file)}
        title="Profilbild zuschneiden"
      />
    </div>
  );
}
