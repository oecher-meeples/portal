import { beforeEach, describe, expect, it, vi } from "vitest";

const listMock = vi.fn();
vi.mock("@vercel/blob", () => ({
  list: (...args: unknown[]) => listMock(...args),
}));

const { getBlobStorageUsage } = await import("@/lib/admin/blob-storage");

beforeEach(() => {
  listMock.mockReset();
  process.env.BLOB_READ_WRITE_TOKEN = "test-token";
});

describe("getBlobStorageUsage", () => {
  it("sums blob sizes from a single page", async () => {
    listMock.mockResolvedValue({
      blobs: [{ size: 1000 }, { size: 2000 }],
      hasMore: false,
    });

    const result = await getBlobStorageUsage();

    expect(result.used).toBe(3000);
    expect(result.limit).toBe(1 * 1024 * 1024 * 1024);
    expect(result.percent).toBeCloseTo((3000 / (1 * 1024 * 1024 * 1024)) * 100);
    expect(listMock).toHaveBeenCalledTimes(1);
  });

  it("paginates through multiple pages until hasMore is false", async () => {
    listMock
      .mockResolvedValueOnce({
        blobs: [{ size: 1000 }],
        hasMore: true,
        cursor: "cursor-1",
      })
      .mockResolvedValueOnce({
        blobs: [{ size: 500 }],
        hasMore: false,
      });

    const result = await getBlobStorageUsage();

    expect(result.used).toBe(1500);
    expect(listMock).toHaveBeenCalledTimes(2);
    expect(listMock).toHaveBeenNthCalledWith(2, {
      token: "test-token",
      cursor: "cursor-1",
      limit: 1000,
    });
  });

  it("uses the BLOB_READ_WRITE_TOKEN env var", async () => {
    listMock.mockResolvedValue({ blobs: [], hasMore: false });

    await getBlobStorageUsage();

    expect(listMock).toHaveBeenCalledWith(
      expect.objectContaining({ token: "test-token" }),
    );
  });

  it("throws with a clear message when the token is missing", async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;

    await expect(getBlobStorageUsage()).rejects.toThrow(
      "BLOB_READ_WRITE_TOKEN",
    );
  });
});
