import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
const deleteBlobsMock = vi.fn();
vi.mock("@/lib/utils/blob-delete", () => ({
  deleteBlobs: (...args: unknown[]) => deleteBlobsMock(...args),
}));

const { deleteOrphanedPostImages } = await import("./post-images-cleanup");

const NOW = new Date("2026-11-26T12:00:00Z");

describe("deleteOrphanedPostImages", () => {
  it("only selects unlinked images older than 24 hours", async () => {
    prismaMock.postImage.findMany.mockResolvedValue([]);

    const count = await deleteOrphanedPostImages(NOW);

    expect(count).toBe(0);
    expect(prismaMock.postImage.findMany).toHaveBeenCalledWith({
      where: {
        postId: null,
        createdAt: { lt: new Date("2026-11-25T12:00:00Z") },
      },
      select: { id: true, key: true },
    });
    expect(prismaMock.postImage.deleteMany).not.toHaveBeenCalled();
    expect(deleteBlobsMock).not.toHaveBeenCalled();
  });

  it("deletes rows and files of the orphans and returns their count", async () => {
    prismaMock.postImage.findMany.mockResolvedValue([
      { id: "i1", key: "blog-images/a.png" },
      { id: "i2", key: "blog-images/b.png" },
    ] as never);

    const count = await deleteOrphanedPostImages(NOW);

    expect(count).toBe(2);
    expect(prismaMock.postImage.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["i1", "i2"] } },
    });
    expect(deleteBlobsMock).toHaveBeenCalledWith([
      "blog-images/a.png",
      "blog-images/b.png",
    ]);
  });
});
