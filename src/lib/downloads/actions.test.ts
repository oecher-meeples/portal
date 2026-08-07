import { describe, expect, it, vi } from "vitest";
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
  getDownloadUploadToken,
} = await import("./actions");

const VALID_INPUT = {
  title: "Mitgliedsantrag",
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

  it("normalises the pathname to the downloads namespace with the correct content-type whitelist", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    hasPermissionMock.mockResolvedValue(true);
    generateClientTokenMock.mockResolvedValue("token-123");

    const token = await getDownloadUploadToken("../evil.pdf");

    expect(token).toBe("token-123");
    expect(generateClientTokenMock).toHaveBeenCalledWith({
      pathname: "downloads/evil.pdf",
      allowedContentTypes: [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ],
      addRandomSuffix: true,
      maximumSizeInBytes: 20 * 1024 * 1024,
    });
  });
});
