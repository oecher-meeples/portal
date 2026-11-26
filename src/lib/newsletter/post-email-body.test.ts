import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
const getBlobMock = vi.fn();
vi.mock("@/lib/utils/s3", () => ({ getBlob: (k: string) => getBlobMock(k) }));

const { buildPostEmailBody } = await import("./post-email-body");

describe("buildPostEmailBody", () => {
  it("renders markdown to html without touching the database when there are no images", async () => {
    const { html, attachments } = await buildPostEmailBody({
      id: "p1",
      body: "Ein **toller** Tag.",
    });

    expect(html).toContain("<strong>toller</strong>");
    expect(attachments).toEqual([]);
    expect(prismaMock.postImage.findMany).not.toHaveBeenCalled();
  });

  it("embeds images of the post as cid attachments", async () => {
    prismaMock.postImage.findMany.mockResolvedValue([
      { id: "i1", key: "blog-images/foto-x.webp" },
    ] as never);
    getBlobMock.mockResolvedValue({
      bytes: new Uint8Array([1, 2]),
      contentType: "image/webp",
    });

    const { html, attachments } = await buildPostEmailBody({
      id: "p1",
      body: "![Foto](/api/blog-images/i1)",
    });

    expect(prismaMock.postImage.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["i1"] }, postId: "p1" },
      select: { id: true, key: true },
    });
    expect(html).toContain('src="cid:i1"');
    expect(html).toContain('alt="Foto"');
    expect(attachments).toEqual([
      {
        filename: "foto-x.webp",
        content: Buffer.from([1, 2]),
        cid: "i1",
        contentType: "image/webp",
      },
    ]);
  });

  it("drops references to images that do not belong to the post", async () => {
    prismaMock.postImage.findMany.mockResolvedValue([]);

    const { html, attachments } = await buildPostEmailBody({
      id: "p1",
      body: "Text ![x](/api/blog-images/foreign)",
    });

    expect(html).not.toContain("<img");
    expect(html).not.toContain("blog-images");
    expect(attachments).toEqual([]);
  });

  it("fails when a file is missing in storage", async () => {
    prismaMock.postImage.findMany.mockResolvedValue([
      { id: "i1", key: "blog-images/gone.png" },
    ] as never);
    getBlobMock.mockResolvedValue(null);

    await expect(
      buildPostEmailBody({ id: "p1", body: "![x](/api/blog-images/i1)" }),
    ).rejects.toThrow("Beitragsbild i1 fehlt im Speicher.");
  });
});
