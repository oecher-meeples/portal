/** Pixel-space crop region, as reported by `react-easy-crop`'s `onCropComplete`. */
export type PixelCropArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Loads `source` (a `File`/`Blob` or an object URL) into an `HTMLImageElement`. */
function loadImage(source: File | Blob | string): Promise<HTMLImageElement> {
  const url = typeof source === "string" ? source : URL.createObjectURL(source);
  const revoke =
    typeof source === "string" ? () => {} : () => URL.revokeObjectURL(url);

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      revoke();
      resolve(image);
    };
    image.onerror = () => {
      revoke();
      reject(new Error("Bild konnte nicht geladen werden."));
    };
    image.src = url;
  });
}

/**
 * Crops `source` to the given pixel region and re-encodes it as WebP via the
 * Canvas API, analog to `compressImage()` in `compress-image.ts`. `fileName`
 * is used (with its extension swapped for `.webp`) as the resulting file's
 * name.
 */
export async function cropImage(
  source: File | Blob | string,
  area: PixelCropArea,
  {
    fileName = source instanceof File ? source.name : "crop.webp",
    quality = 0.9,
  } = {},
): Promise<File> {
  const image = await loadImage(source);

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(area.width));
  canvas.height = Math.max(1, Math.round(area.height));
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas-2D-Kontext nicht verfügbar.");
  }

  context.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", quality),
  );
  if (!blob) {
    throw new Error("Zuschneiden fehlgeschlagen.");
  }

  const newName = fileName.replace(/\.[^.]+$/, "") + ".webp";
  return new File([blob], newName, { type: "image/webp" });
}
