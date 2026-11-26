import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
const deleteBlobs = vi.fn();
vi.mock("@/lib/utils/blob-delete", () => ({
  deleteBlobs: (...args: unknown[]) => deleteBlobs(...args),
}));

const { setHelperRoleGuide, removeHelperRoleGuide } =
  await import("./helper-role-guide");
const { deleteHelperRole } = await import("./helper-roles");

const FILE = {
  fileKey: "downloads/kasse-new.pdf",
  fileName: "kasse.pdf",
  fileType: "PDF",
  fileSizeBytes: 1234,
};

beforeEach(() => deleteBlobs.mockClear());

describe("setHelperRoleGuide", () => {
  it("creates an INTERNAL download titled after the role on first upload", async () => {
    prismaMock.helperRole.findUnique.mockResolvedValue({
      name: "Kasse",
      guideDownload: null,
    } as never);

    const result = await setHelperRoleGuide("role-1", FILE);

    expect(result).toEqual({ success: true });
    expect(prismaMock.helperRole.update).toHaveBeenCalledWith({
      where: { id: "role-1" },
      data: {
        guideDownload: {
          create: { title: "Anleitung Kasse", status: "INTERNAL", ...FILE },
        },
      },
    });
    expect(deleteBlobs).not.toHaveBeenCalled();
  });

  it("replaces the file of the existing download and deletes the old blob", async () => {
    prismaMock.helperRole.findUnique.mockResolvedValue({
      name: "Kasse",
      guideDownload: { id: "dl-1", fileKey: "downloads/kasse-old.pdf" },
    } as never);

    const result = await setHelperRoleGuide("role-1", FILE);

    expect(result).toEqual({ success: true });
    expect(prismaMock.download.update).toHaveBeenCalledWith({
      where: { id: "dl-1" },
      data: { ...FILE, fileUpdatedAt: expect.any(Date) },
    });
    expect(deleteBlobs).toHaveBeenCalledWith(["downloads/kasse-old.pdf"]);
  });

  it("errors for an unknown role", async () => {
    prismaMock.helperRole.findUnique.mockResolvedValue(null);

    expect(await setHelperRoleGuide("nope", FILE)).toEqual({
      error: "Helferrolle nicht gefunden.",
    });
  });
});

describe("removeHelperRoleGuide", () => {
  it("deletes the download and its blob", async () => {
    prismaMock.helperRole.findUnique.mockResolvedValue({
      guideDownload: { id: "dl-1", fileKey: "downloads/kasse.pdf" },
    } as never);

    const result = await removeHelperRoleGuide("role-1");

    expect(result).toEqual({ success: true });
    expect(prismaMock.download.delete).toHaveBeenCalledWith({
      where: { id: "dl-1" },
    });
    expect(deleteBlobs).toHaveBeenCalledWith(["downloads/kasse.pdf"]);
  });

  it("leaves a role without guide untouched", async () => {
    prismaMock.helperRole.findUnique.mockResolvedValue({
      guideDownload: null,
    } as never);

    expect(await removeHelperRoleGuide("role-1")).toEqual({ success: true });
    expect(prismaMock.download.delete).not.toHaveBeenCalled();
    expect(deleteBlobs).not.toHaveBeenCalled();
  });
});

describe("deleteHelperRole (guide cleanup)", () => {
  it("also deletes the guide download and blob", async () => {
    prismaMock.shift.count.mockResolvedValue(0);
    prismaMock.helperRole.findUnique.mockResolvedValue({
      guideDownload: { id: "dl-1", fileKey: "downloads/kasse.pdf" },
    } as never);

    const result = await deleteHelperRole("role-1");

    expect(result).toEqual({ success: true });
    expect(prismaMock.helperRole.delete).toHaveBeenCalledWith({
      where: { id: "role-1" },
    });
    expect(prismaMock.download.delete).toHaveBeenCalledWith({
      where: { id: "dl-1" },
    });
    expect(deleteBlobs).toHaveBeenCalledWith(["downloads/kasse.pdf"]);
  });

  it("deletes a role without guide without touching downloads or blobs", async () => {
    prismaMock.shift.count.mockResolvedValue(0);
    prismaMock.helperRole.findUnique.mockResolvedValue({
      guideDownload: null,
    } as never);

    await deleteHelperRole("role-1");

    expect(prismaMock.download.delete).not.toHaveBeenCalled();
    expect(deleteBlobs).not.toHaveBeenCalled();
  });
});
