import { ImageResponse } from "@vercel/og";
import type { Post } from "@prisma/client";
import { blobKeyFrom } from "@/lib/utils/blob-access";
import { getBlob, publicUrlForKey, putBlob } from "@/lib/utils/s3";
import { toJpeg } from "@/lib/utils/to-jpeg";

const IMAGE_SIZE = 1080;

async function generateFallbackCoverImage(post: {
  title: string;
  excerpt: string;
}): Promise<ArrayBuffer> {
  const image = new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "80px",
        backgroundColor: "#1c1917",
        color: "#fafaf9",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ fontSize: 56, fontWeight: 700, textAlign: "center" }}>
        {post.title}
      </div>
      <div
        style={{
          fontSize: 32,
          marginTop: 32,
          textAlign: "center",
          color: "#d6d3d1",
        }}
      >
        {post.excerpt}
      </div>
    </div>,
    { width: IMAGE_SIZE, height: IMAGE_SIZE },
  );
  return image.arrayBuffer();
}

/** `instagram-covers/` ist öffentlich (#112): Instagram lädt das Bild selbst.
 * Meta akzeptiert dort nur JPEG, daher wird jedes Cover als JPEG abgelegt. */
async function uploadJpegCover(slug: string, bytes: Uint8Array | ArrayBuffer) {
  const key = await putBlob(
    `instagram-covers/${slug}.jpg`,
    await toJpeg(bytes),
    "image/jpeg",
  );
  return publicUrlForKey(key);
}

/** Cover-URL für Instagram, immer ein JPEG: ein vorhandenes Cover (im Editor
 * als WebP hochgeladen) wird konvertiert, ohne Cover entsteht ein
 * generiertes. Fremde URLs außerhalb unseres Buckets bleiben unverändert. */
export async function resolveCoverImageUrl(
  post: Pick<Post, "slug" | "title" | "excerpt" | "coverImageUrl">,
): Promise<string> {
  if (!post.coverImageUrl) {
    return uploadJpegCover(post.slug, await generateFallbackCoverImage(post));
  }

  const key = blobKeyFrom(post.coverImageUrl);
  const blob = key ? await getBlob(key) : null;
  if (!blob || blob.contentType === "image/jpeg") return post.coverImageUrl;
  return uploadJpegCover(post.slug, blob.bytes);
}
