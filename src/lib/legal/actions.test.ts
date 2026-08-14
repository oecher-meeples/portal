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

const extractPdfTextMock = vi.fn();
vi.mock("@/lib/legal/pdf-extract", () => ({
  extractPdfText: (...args: unknown[]) => extractPdfTextMock(...args),
}));

const { getLegalUploadToken, extractLegalPdfText, saveLegalDocument } =
  await import("./actions");

const VALID_SECTIONS = [
  { id: "name-sitz", heading: "§ 1 Name und Sitz", paragraphs: ["Text."] },
];

beforeEach(() => {
  deleteBlobsMock.mockClear();
});

describe("getLegalUploadToken", () => {
  it("rejects when the user lacks the legal:manage permission", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    hasPermissionMock.mockResolvedValue(false);

    await expect(getLegalUploadToken("legal/a.pdf")).rejects.toThrow(
      "Keine Berechtigung.",
    );
    expect(generateClientTokenMock).not.toHaveBeenCalled();
  });

  it("normalises the pathname to the legal namespace, PDF only", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    hasPermissionMock.mockResolvedValue(true);
    generateClientTokenMock.mockResolvedValue("token-123");

    const token = await getLegalUploadToken("../evil.pdf");

    expect(token).toBe("token-123");
    expect(generateClientTokenMock).toHaveBeenCalledWith({
      pathname: "legal/evil.pdf",
      allowedContentTypes: ["application/pdf"],
      addRandomSuffix: true,
      maximumSizeInBytes: 20 * 1024 * 1024,
    });
  });
});

describe("extractLegalPdfText", () => {
  it("rejects when the user lacks the legal:manage permission", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    hasPermissionMock.mockResolvedValue(false);

    const result = await extractLegalPdfText("https://blob.example/a.pdf");

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(extractPdfTextMock).not.toHaveBeenCalled();
  });

  it("returns the extracted text when authorized", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    hasPermissionMock.mockResolvedValue(true);
    extractPdfTextMock.mockResolvedValue("§ 1 Name und Sitz");

    const result = await extractLegalPdfText("https://blob.example/a.pdf");

    expect(result).toEqual({ success: true, text: "§ 1 Name und Sitz" });
  });
});

describe("saveLegalDocument", () => {
  it("rejects when the user lacks the legal:manage permission", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    hasPermissionMock.mockResolvedValue(false);

    const result = await saveLegalDocument(
      "satzung",
      "Vereinssatzung",
      VALID_SECTIONS,
    );

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(prismaMock.legalDocument.upsert).not.toHaveBeenCalled();
  });

  it("rejects an invalid sections shape", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    hasPermissionMock.mockResolvedValue(true);

    const result = await saveLegalDocument("satzung", "Vereinssatzung", [
      { heading: "Ohne id" },
    ]);

    expect(result).toEqual({ error: "Ungültiges Format der Sections." });
    expect(prismaMock.legalDocument.upsert).not.toHaveBeenCalled();
  });

  it("upserts the document when authorized", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    hasPermissionMock.mockResolvedValue(true);
    prismaMock.legalDocument.findUnique.mockResolvedValue({
      pdfFileUrl: null,
    } as never);

    const result = await saveLegalDocument(
      "satzung",
      "Vereinssatzung",
      VALID_SECTIONS,
    );

    expect(result).toEqual({ success: true });
    expect(prismaMock.legalDocument.upsert).toHaveBeenCalledWith({
      where: { slug: "satzung" },
      update: {
        title: "Vereinssatzung",
        sections: VALID_SECTIONS,
        pdfFileUrl: undefined,
      },
      create: {
        slug: "satzung",
        title: "Vereinssatzung",
        sections: VALID_SECTIONS,
        pdfFileUrl: undefined,
      },
    });
    expect(deleteBlobsMock).not.toHaveBeenCalled();
  });

  it("deletes the old blob when the PDF is replaced", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    hasPermissionMock.mockResolvedValue(true);
    prismaMock.legalDocument.findUnique.mockResolvedValue({
      pdfFileUrl: "https://blob.example/legal/satzung-old.pdf",
    } as never);

    const result = await saveLegalDocument(
      "satzung",
      "Vereinssatzung",
      VALID_SECTIONS,
      "https://blob.example/legal/satzung-new.pdf",
    );

    expect(result).toEqual({ success: true });
    expect(deleteBlobsMock).toHaveBeenCalledWith([
      "https://blob.example/legal/satzung-old.pdf",
    ]);
  });
});
