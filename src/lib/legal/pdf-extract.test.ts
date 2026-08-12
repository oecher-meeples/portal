import { beforeEach, describe, expect, it, vi } from "vitest";

const extractTextMock = vi.fn();
vi.mock("unpdf", () => ({
  extractText: (...args: unknown[]) => extractTextMock(...args),
}));

const { extractPdfText } = await import("./pdf-extract");

const FILE_URL = "https://blob.example/legal/satzung.pdf";

beforeEach(() => {
  extractTextMock.mockReset();
});

describe("extractPdfText", () => {
  it("returns the merged text on success", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(4),
    }) as unknown as typeof fetch;
    extractTextMock.mockResolvedValue({
      totalPages: 2,
      text: "§ 1 Name und Sitz\n\n§ 2 Vereinszweck",
    });

    const text = await extractPdfText(FILE_URL);

    expect(text).toBe("§ 1 Name und Sitz\n\n§ 2 Vereinszweck");
    expect(extractTextMock).toHaveBeenCalledWith(expect.any(Uint8Array), {
      mergePages: true,
    });
  });

  it("throws when the blob fetch fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }) as unknown as typeof fetch;

    await expect(extractPdfText(FILE_URL)).rejects.toThrow(
      "PDF konnte nicht geladen werden",
    );
    expect(extractTextMock).not.toHaveBeenCalled();
  });

  it("throws when the extracted text is empty", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(4),
    }) as unknown as typeof fetch;
    extractTextMock.mockResolvedValue({ totalPages: 1, text: "   " });

    await expect(extractPdfText(FILE_URL)).rejects.toThrow(
      "keinen extrahierbaren Text",
    );
  });
});
