import { put } from "@vercel/blob";
import { ImageResponse } from "@vercel/og";
import type { Post } from "@prisma/client";

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

export async function resolveCoverImageUrl(
  post: Pick<Post, "slug" | "title" | "excerpt" | "coverImageUrl">,
): Promise<string> {
  if (post.coverImageUrl) return post.coverImageUrl;

  const png = await generateFallbackCoverImage(post);
  const blob = await put(`instagram-covers/${post.slug}.png`, png, {
    access: "public",
    contentType: "image/png",
    addRandomSuffix: true,
  });
  return blob.url;
}
