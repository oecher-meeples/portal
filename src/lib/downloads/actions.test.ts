import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: getCurrentUserMock }));

const hasPermissionMock = vi.fn();
vi.mock("@/lib/auth/permissions", () => ({
  hasPermission: (...args: unknown[]) => hasPermissionMock(...args),
}));

const deleteBlobsMock = vi.fn();
vi.mock("@/lib/utils/blob-delete", () => ({
  deleteBlobs: (...args: unknown[]) => deleteBlobsMock(...args),
}));

const generateClientTokenMock = vi.fn();
vi.mock("@vercel/blob/client", () => ({
  generateClientTokenFromReadWriteToken: (...args: unknown[]) =>
    generateClientTokenMock(...args),
}));

const {
  createDownload,
  setDownloadStatus,
  deleteDownload,
  replaceDownloadFile,
  reorderDownloads,
  getDownloadUploadToken,
} = await import("./actions");

const VALID_INPUT = {
  title: "Mitgliedsantrag",
  fileName: "mitgliedsantrag.pdf",
  fileUrl: "https://blob.example/downloads/mitgliedsantrag.pdf",
  fileType: "PDF",
  fileSizeBytes: 1234,
};

describe("createDownload", () => {
  it("rejects when there is no logged-in user", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    const result = await createDownload(VALID_INPUT);

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(prismaMock.download.create).not.toHaveBeenCalled();
  });

  it("rejects when the user lacks the downloads:manage permission", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    hasPermissionMock.mockResolvedValue(false);

    const result = await createDownload(VALID_INPUT);

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(prismaMock.download.create).not.toHaveBeenCalled();
  });

  it("creates the download when authorized", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    hasPermissionMock.mockResolvedValue(true);

    const result = await createDownload(VALID_INPUT);

    expect(result).toEqual({ success: true });
    expect(prismaMock.download.create).toHaveBeenCalledWith({
      data: VALID_INPUT,
    });
  });
});

describe("setDownloadStatus", () => {
  it("rejects when the user lacks the downloads:manage permission", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    hasPermissionMock.mockResolvedValue(false);

    const result = await setDownloadStatus("download-1", "OFFLINE");

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(prismaMock.download.update).not.toHaveBeenCalled();
  });

  it("updates the status when authorized", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    hasPermissionMock.mockResolvedValue(true);

    const result = await setDownloadStatus("download-1", "INTERNAL");

    expect(result).toEqual({ success: true });
    expect(prismaMock.download.update).toHaveBeenCalledWith({
      where: { id: "download-1" },
      data: { status: "INTERNAL" },
    });
  });
});

describe("deleteDownload", () => {
  it("rejects when the user lacks the downloads:manage permission", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    hasPermissionMock.mockResolvedValue(false);

    const result = await deleteDownload("download-1");

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(deleteBlobsMock).not.toHaveBeenCalled();
    expect(prismaMock.download.delete).not.toHaveBeenCalled();
  });

  it("returns an error when the download does not exist", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    hasPermissionMock.mockResolvedValue(true);
    prismaMock.download.findUnique.mockResolvedValue(null);

    const result = await deleteDownload("missing-id");

    expect(result).toEqual({ error: "Download nicht gefunden." });
    expect(deleteBlobsMock).not.toHaveBeenCalled();
    expect(prismaMock.download.delete).not.toHaveBeenCalled();
  });

  it("deletes the blob and the row when authorized", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    hasPermissionMock.mockResolvedValue(true);
    prismaMock.download.findUnique.mockResolvedValue({
      fileUrl: VALID_INPUT.fileUrl,
    } as never);

    const result = await deleteDownload("download-1");

    expect(result).toEqual({ success: true });
    expect(deleteBlobsMock).toHaveBeenCalledWith([VALID_INPUT.fileUrl]);
    expect(prismaMock.download.delete).toHaveBeenCalledWith({
      where: { id: "download-1" },
    });
  });
});

describe("replaceDownloadFile", () => {
  beforeEach(() => {
    deleteBlobsMock.mockClear();
  });

  const NEW_FILE = {
    fileUrl: "https://blob.example/downloads/mitgliedsantrag-v2.pdf",
    fileType: "PDF",
    fileSizeBytes: 4321,
    fileName: "mitgliedsantrag-v2.pdf",
  };

  it("rejects when the user lacks the downloads:manage permission", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    hasPermissionMock.mockResolvedValue(false);

    const result = await replaceDownloadFile("download-1", NEW_FILE);

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(prismaMock.download.update).not.toHaveBeenCalled();
    expect(deleteBlobsMock).not.toHaveBeenCalled();
  });

  it("returns an error when the download does not exist", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    hasPermissionMock.mockResolvedValue(true);
    prismaMock.download.findUnique.mockResolvedValue(null);

    const result = await replaceDownloadFile("missing-id", NEW_FILE);

    expect(result).toEqual({ error: "Download nicht gefunden." });
    expect(prismaMock.download.update).not.toHaveBeenCalled();
    expect(deleteBlobsMock).not.toHaveBeenCalled();
  });

  it("updates the file fields and deletes the old blob only after the update", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    hasPermissionMock.mockResolvedValue(true);
    prismaMock.download.findUnique.mockResolvedValue({
      fileUrl: VALID_INPUT.fileUrl,
    } as never);
    const callOrder: string[] = [];
    prismaMock.download.update.mockImplementation((async () => {
      callOrder.push("update");
      return {} as never;
    }) as never);
    deleteBlobsMock.mockImplementation(async () => {
      callOrder.push("delete");
    });

    const result = await replaceDownloadFile("download-1", NEW_FILE);

    expect(result).toEqual({ success: true });
    expect(prismaMock.download.update).toHaveBeenCalledWith({
      where: { id: "download-1" },
      data: NEW_FILE,
    });
    expect(deleteBlobsMock).toHaveBeenCalledWith([VALID_INPUT.fileUrl]);
    expect(callOrder).toEqual(["update", "delete"]);
  });
});

describe("reorderDownloads", () => {
  it("rejects when the user lacks the downloads:manage permission", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    hasPermissionMock.mockResolvedValue(false);

    const result = await reorderDownloads(["download-1", "download-2"]);

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("sets order by position for the given ids when authorized", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    hasPermissionMock.mockResolvedValue(true);
    prismaMock.download.findMany.mockResolvedValue([
      { id: "download-1", status: "PUBLIC" },
      { id: "download-2", status: "INTERNAL" },
    ] as never);
    prismaMock.$transaction.mockResolvedValue([]);

    const result = await reorderDownloads(["download-1", "download-2"]);

    expect(result).toEqual({ success: true });
    expect(prismaMock.download.update).toHaveBeenNthCalledWith(1, {
      where: { id: "download-1" },
      data: { order: 0 },
    });
    expect(prismaMock.download.update).toHaveBeenNthCalledWith(2, {
      where: { id: "download-2" },
      data: { order: 1 },
    });
  });

  it("drops OFFLINE ids instead of reordering them", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    hasPermissionMock.mockResolvedValue(true);
    prismaMock.download.findMany.mockResolvedValue([
      { id: "download-1", status: "PUBLIC" },
      { id: "download-offline", status: "OFFLINE" },
      { id: "download-2", status: "INTERNAL" },
    ] as never);
    prismaMock.$transaction.mockResolvedValue([]);

    await reorderDownloads(["download-1", "download-offline", "download-2"]);

    expect(prismaMock.download.update).toHaveBeenCalledTimes(2);
    expect(prismaMock.download.update).toHaveBeenNthCalledWith(1, {
      where: { id: "download-1" },
      data: { order: 0 },
    });
    expect(prismaMock.download.update).toHaveBeenNthCalledWith(2, {
      where: { id: "download-2" },
      data: { order: 1 },
    });
  });
});

describe("getDownloadUploadToken", () => {
  it("rejects when there is no logged-in user", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    await expect(getDownloadUploadToken("downloads/a.pdf")).rejects.toThrow(
      "Keine Berechtigung.",
    );
    expect(generateClientTokenMock).not.toHaveBeenCalled();
  });

  it("rejects when the user lacks the downloads:manage permission", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    hasPermissionMock.mockResolvedValue(false);

    await expect(getDownloadUploadToken("downloads/a.pdf")).rejects.toThrow(
      "Keine Berechtigung.",
    );
    expect(generateClientTokenMock).not.toHaveBeenCalled();
  });

  it("normalises the pathname to the downloads namespace without a content-type restriction", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    hasPermissionMock.mockResolvedValue(true);
    generateClientTokenMock.mockResolvedValue("token-123");

    const token = await getDownloadUploadToken("../evil.pdf");

    expect(token).toBe("token-123");
    expect(generateClientTokenMock).toHaveBeenCalledWith({
      pathname: "downloads/evil.pdf",
      addRandomSuffix: true,
      maximumSizeInBytes: 20 * 1024 * 1024,
    });
  });
});
