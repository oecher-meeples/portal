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
  createImportantLink,
  updateImportantLink,
  deleteImportantLink,
  getImportantLinkUploadToken,
} = await import("./actions");

const VALID_INPUT = {
  title: "Vereinssatzung",
  targetUrl: "https://example.org/satzung.pdf",
  iconUrl: "https://blob.example/important-links/icon.webp",
};

describe("createImportantLink", () => {
  it("rejects when there is no logged-in user", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    const result = await createImportantLink(VALID_INPUT);

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(prismaMock.importantLink.create).not.toHaveBeenCalled();
  });

  it("rejects when the user lacks the links:manage permission", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    hasPermissionMock.mockResolvedValue(false);

    const result = await createImportantLink(VALID_INPUT);

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(prismaMock.importantLink.create).not.toHaveBeenCalled();
  });

  it("creates the link when authorized", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    hasPermissionMock.mockResolvedValue(true);

    const result = await createImportantLink(VALID_INPUT);

    expect(result).toEqual({ success: true });
    expect(prismaMock.importantLink.create).toHaveBeenCalledWith({
      data: VALID_INPUT,
    });
  });
});

describe("updateImportantLink", () => {
  it("rejects when the user lacks the links:manage permission", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    hasPermissionMock.mockResolvedValue(false);

    const result = await updateImportantLink("link-1", VALID_INPUT);

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(prismaMock.importantLink.update).not.toHaveBeenCalled();
  });

  it("updates the link when authorized", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    hasPermissionMock.mockResolvedValue(true);

    const result = await updateImportantLink("link-1", VALID_INPUT);

    expect(result).toEqual({ success: true });
    expect(prismaMock.importantLink.update).toHaveBeenCalledWith({
      where: { id: "link-1" },
      data: VALID_INPUT,
    });
  });
});

describe("deleteImportantLink", () => {
  beforeEach(() => {
    deleteBlobsMock.mockClear();
  });

  it("rejects when the user lacks the links:manage permission", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    hasPermissionMock.mockResolvedValue(false);

    const result = await deleteImportantLink("link-1");

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(deleteBlobsMock).not.toHaveBeenCalled();
    expect(prismaMock.importantLink.delete).not.toHaveBeenCalled();
  });

  it("returns an error when the link does not exist", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    hasPermissionMock.mockResolvedValue(true);
    prismaMock.importantLink.findUnique.mockResolvedValue(null);

    const result = await deleteImportantLink("missing-id");

    expect(result).toEqual({ error: "Link nicht gefunden." });
    expect(deleteBlobsMock).not.toHaveBeenCalled();
    expect(prismaMock.importantLink.delete).not.toHaveBeenCalled();
  });

  it("deletes the icon blob and the row when authorized", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    hasPermissionMock.mockResolvedValue(true);
    prismaMock.importantLink.findUnique.mockResolvedValue({
      iconUrl: VALID_INPUT.iconUrl,
    } as never);

    const result = await deleteImportantLink("link-1");

    expect(result).toEqual({ success: true });
    expect(deleteBlobsMock).toHaveBeenCalledWith([VALID_INPUT.iconUrl]);
    expect(prismaMock.importantLink.delete).toHaveBeenCalledWith({
      where: { id: "link-1" },
    });
  });

  it("skips the blob deletion when the link has no icon", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    hasPermissionMock.mockResolvedValue(true);
    prismaMock.importantLink.findUnique.mockResolvedValue({
      iconUrl: null,
    } as never);

    const result = await deleteImportantLink("link-1");

    expect(result).toEqual({ success: true });
    expect(deleteBlobsMock).not.toHaveBeenCalled();
    expect(prismaMock.importantLink.delete).toHaveBeenCalledWith({
      where: { id: "link-1" },
    });
  });
});

describe("getImportantLinkUploadToken", () => {
  it("rejects when there is no logged-in user", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    await expect(
      getImportantLinkUploadToken("important-links/a.webp"),
    ).rejects.toThrow("Keine Berechtigung.");
    expect(generateClientTokenMock).not.toHaveBeenCalled();
  });

  it("rejects when the user lacks the links:manage permission", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    hasPermissionMock.mockResolvedValue(false);

    await expect(
      getImportantLinkUploadToken("important-links/a.webp"),
    ).rejects.toThrow("Keine Berechtigung.");
    expect(generateClientTokenMock).not.toHaveBeenCalled();
  });

  it("normalises the pathname to the important-links namespace", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    hasPermissionMock.mockResolvedValue(true);
    generateClientTokenMock.mockResolvedValue("token-123");

    const token = await getImportantLinkUploadToken("../evil.webp");

    expect(token).toBe("token-123");
    expect(generateClientTokenMock).toHaveBeenCalledWith({
      pathname: "important-links/evil.webp",
      allowedContentTypes: ["image/png", "image/jpeg", "image/webp"],
      addRandomSuffix: true,
      maximumSizeInBytes: 8 * 1024 * 1024,
    });
  });
});
