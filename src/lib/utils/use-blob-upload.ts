"use client";

import { useState } from "react";
import { put } from "@vercel/blob/client";

/**
 * Shared client-side upload orchestration for `@vercel/blob/client`. Token
 * issuance stays with the caller (`getToken`) so each feature keeps its own
 * permission check — only the upload mechanics (pathname, `put()`, state) are shared.
 */
export function useBlobUpload(
  pathPrefix: string,
  getToken: (pathname: string) => Promise<string>,
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
        const token = await getToken(pathname);
        const blob = await put(pathname, file, { access: "public", token });
        urls.push(blob.url);
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
