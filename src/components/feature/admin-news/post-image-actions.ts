"use server";

import { requirePostEditor } from "@/lib/content/post-permissions";
import {
  POST_IMAGE_CONTENT_TYPES,
  POST_IMAGE_MAX_BYTES,
  POST_IMAGE_PREFIX,
  postImageUrl,
} from "@/lib/content/post-images";
import { actionErrorMessage, UserFacingError } from "@/lib/utils/action-result";
import { toStoredBlobRef } from "@/lib/utils/blob-access";
import { normaliseBlobPath } from "@/lib/utils/blob-path";
import { createBlobUploadToken } from "@/lib/utils/blob-upload-token";
import { prisma } from "@/lib/utils/prisma";

export async function getPostImageUploadToken(
  pathname: string,
  contentType: string,
) {
  await requirePostEditor();

  return createBlobUploadToken({
    pathname: normaliseBlobPath(pathname, POST_IMAGE_PREFIX),
    contentType,
    allowedContentTypes: POST_IMAGE_CONTENT_TYPES,
    addRandomSuffix: true,
    maximumSizeInBytes: POST_IMAGE_MAX_BYTES,
  });
}

function toPostImageKey(url: string) {
  try {
    return toStoredBlobRef(url, POST_IMAGE_PREFIX);
  } catch {
    throw new UserFacingError("Ungültiger Dateiverweis.");
  }
}

/** Legt nach dem Upload den `PostImage`-Eintrag an (noch ohne Beitrag, die
 * Verknüpfung passiert beim Speichern des Beitrags). */
export async function registerPostImage(url: string) {
  try {
    await requirePostEditor();
    const key = toPostImageKey(url);
    const image = await prisma.postImage.create({ data: { key } });
    return {
      success: true as const,
      id: image.id,
      url: postImageUrl(image.id),
    };
  } catch (error) {
    return { error: actionErrorMessage(error) };
  }
}
