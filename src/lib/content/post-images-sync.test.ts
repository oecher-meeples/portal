import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
const deleteBlobsMock = vi.fn();
vi.mock("@/lib/utils/blob-delete", () => ({
  deleteBlobs: (...args: unknown[]) => deleteBlobsMock(...args),
}));

const { syncPostImages, deletePostWithImages } = await import(
  "./post-images-sync"
);

describe("syncPostImages", () => {
  it("links referenced unlinked images and never steals linked ones", async () => {
    prismaMock.postImage.findMany.mockResolvedValue([]);

    await syncPostImages(
      "p1",
      "![a](/api/blog-images/i1) ![b](/api/blog-images/i2)",
    );

    expect(prismaMock.postImage.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["i1", "i2"] }, postId: null },
      data: { postId: "p1" },
    });
    expect(prismaMock.postImage.deleteMany).not.toHaveBeenCalled();
    expect(deleteBlobsMock).not.toHaveBeenCalled();
  });

  it("deletes linked images that are no longer in the body, with their files", async () => {
    prismaMock.postImage.findMany.mockResolvedValue([
      { id: "i2", key: "blog-images/b.png" },
    ] as never);

    await syncPostImages("p1", "![a](/api/blog-images/i1)");

    expect(prismaMock.postImage.findMany).toHaveBeenCalledWith({
      where: { postId: "p1", id: { notIn: ["i1"] } },
      select: { id: true, key: true },
    });
    expect(prismaMock.postImage.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["i2"] } },
    });
    expect(deleteBlobsMock).toHaveBeenCalledWith(["blog-images/b.png"]);
  });

  it("skips linking when the body has no images", async () => {
    prismaMock.postImage.findMany.mockResolvedValue([]);

    await syncPostImages("p1", "nur Text");

    expect(prismaMock.postImage.updateMany).not.toHaveBeenCalled();
  });
});

describe("deletePostWithImages", () => {
  it("deletes the post, then the image files", async () => {
    prismaMock.postImage.findMany.mockResolvedValue([
      { key: "blog-images/a.png" },
      { key: "blog-images/b.png" },
    ] as never);

    await deletePostWithImages("p1");

    expect(prismaMock.post.delete).toHaveBeenCalledWith({
      where: { id: "p1" },
    });
    expect(deleteBlobsMock).toHaveBeenCalledWith([
      "blog-images/a.png",
      "blog-images/b.png",
    ]);
  });
});
