/** Scales `width`/`height` down so the longest edge is at most `maxDimension`, preserving aspect ratio. Returns the input unchanged if it already fits. */
export function computeTargetDimensions(
  width: number,
  height: number,
  maxDimension: number,
) {
  const longestEdge = Math.max(width, height);
  if (longestEdge <= maxDimension) {
    return { width, height };
  }

  const scale = maxDimension / longestEdge;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

/** Downscales and re-encodes an image file as WebP via the Canvas API, no upload dependency. */
export async function compressImage(
  file: File,
  { maxDimension = 1600, quality = 0.82 } = {},
): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = computeTargetDimensions(
    bitmap.width,
    bitmap.height,
    maxDimension,
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return file;

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", quality),
  );
  if (!blob) return file;

  const newName = file.name.replace(/\.[^.]+$/, "") + ".webp";
  return new File([blob], newName, { type: "image/webp" });
}
