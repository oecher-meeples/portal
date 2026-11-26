import sharp from "sharp";

/** Re-encodes an image as JPEG (transparency flattened onto white) — the
 * Instagram Graph API accepts only JPEG for `image_url`. */
export function toJpeg(bytes: Uint8Array | ArrayBuffer): Promise<Buffer> {
  return sharp(bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes)
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 90 })
    .toBuffer();
}
