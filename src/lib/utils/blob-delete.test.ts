import { beforeEach, describe, expect, it, vi } from "vitest";

const delMock = vi.fn();
vi.mock("@vercel/blob", () => ({
  del: (...args: unknown[]) => delMock(...args),
}));

const { deleteBlobs } = await import("@/lib/utils/blob-delete");

beforeEach(() => {
  delMock.mockReset();
  delMock.mockResolvedValue(undefined);
});

describe("deleteBlobs", () => {
  it("deletes all given urls in one call", async () => {
    await deleteBlobs(["https://blob/a.jpg", "https://blob/b.jpg"]);

    expect(delMock).toHaveBeenCalledTimes(1);
    expect(delMock).toHaveBeenCalledWith([
      "https://blob/a.jpg",
      "https://blob/b.jpg",
    ]);
  });

  it("does not call the blob api for an empty list", async () => {
    await deleteBlobs([]);

    expect(delMock).not.toHaveBeenCalled();
  });

  it("ignores blank entries rather than asking the api to delete an empty path", async () => {
    await deleteBlobs(["", "   ", "https://blob/a.jpg"]);

    expect(delMock).toHaveBeenCalledWith(["https://blob/a.jpg"]);
  });

  it("does not call the blob api when only blank entries are given", async () => {
    await deleteBlobs(["", "  "]);

    expect(delMock).not.toHaveBeenCalled();
  });

  it("propagates a failure so the caller can keep the reference and retry", async () => {
    delMock.mockRejectedValue(new Error("blob boom"));

    await expect(deleteBlobs(["https://blob/a.jpg"])).rejects.toThrow(
      "blob boom",
    );
  });
});
