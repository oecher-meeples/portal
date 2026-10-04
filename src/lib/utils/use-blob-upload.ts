"use client";

import { useState } from "react";
import type { BlobUploadToken } from "@/lib/utils/blob-upload-token";

/**
 * Shared client-side upload orchestration against the S3-compatible blob
 * store (SeaweedFS). Token issuance stays with the caller (`getToken`) so each
 * feature keeps its own permission check — only the upload mechanics
 * (pathname, presigned POST, state) are shared.
 *
 * `getToken` receives the file's MIME type too: the server signs it into the
 * POST policy (and checks it against the feature's allowlist), so the bucket
 * rejects a file sent with a different type.
 */
export function useBlobUpload(
  pathPrefix: string,
  getToken: (pathname: string, contentType: string) => Promise<BlobUploadToken>,
) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadFiles(files: File[]): Promise<string[]> {
    setIsUploading(true);
    setError(null);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const pathname = `${pathPrefix}/${file.name}`;
        const contentType = file.type || "application/octet-stream";
        const token = await getToken(pathname, contentType);
        urls.push(await postToBucket(token, file));
      }
      return urls;
    } catch (error) {
      const reason = error instanceof Error ? error.message : null;
      setError(
        reason
          ? `Datei(en) konnten nicht hochgeladen werden: ${reason}`
          : "Datei(en) konnten nicht hochgeladen werden.",
      );
      return [];
    } finally {
      setIsUploading(false);
    }
  }

  return { uploadFiles, isUploading, error };
}

/** Browser → bucket directly (no proxy through the app server). The file
 * must be the last form field, S3 ignores everything after it. */
async function postToBucket(token: BlobUploadToken, file: File) {
  const form = new FormData();
  for (const [name, value] of Object.entries(token.fields)) {
    form.append(name, value);
  }
  form.append("file", file);

  const response = await fetch(token.url, { method: "POST", body: form });
  if (!response.ok) {
    throw new Error(`Speicher antwortete mit HTTP ${response.status}`);
  }
  return token.publicUrl;
}
