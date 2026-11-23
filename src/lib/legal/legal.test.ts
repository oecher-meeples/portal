import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { getLegalDocument, listAllLegalDocuments } =
  await import("@/lib/legal/legal");

describe("getLegalDocument", () => {
  it("returns the document for a known slug", async () => {
    const doc = {
      id: "doc-1",
      slug: "satzung",
      title: "Vereinssatzung",
      sections: [],
      pdfFileUrl: null,
      updatedAt: new Date(),
    };
    prismaMock.legalDocument.findUnique.mockResolvedValue(doc as never);

    const result = await getLegalDocument("satzung");

    expect(result).toEqual(doc);
    expect(prismaMock.legalDocument.findUnique).toHaveBeenCalledWith({
      where: { slug: "satzung" },
    });
  });

  it("returns null for an unknown slug", async () => {
    prismaMock.legalDocument.findUnique.mockResolvedValue(null);

    const result = await getLegalDocument("unbekannt");

    expect(result).toBeNull();
  });
});

describe("listAllLegalDocuments", () => {
  it("returns all documents in the fixed LEGAL_DOCS order", async () => {
    prismaMock.legalDocument.findMany.mockResolvedValue([
      { slug: "beitragsordnung" },
      { slug: "urheberrechte" },
      { slug: "satzung" },
      { slug: "impressum" },
      { slug: "datenschutz" },
    ] as never);

    const result = await listAllLegalDocuments();

    expect(result.map((doc) => doc.slug)).toEqual([
      "satzung",
      "datenschutz",
      "impressum",
      "beitragsordnung",
      "urheberrechte",
    ]);
  });

  it("skips a fixed slug that has no row yet", async () => {
    prismaMock.legalDocument.findMany.mockResolvedValue([
      { slug: "satzung" },
    ] as never);

    const result = await listAllLegalDocuments();

    expect(result.map((doc) => doc.slug)).toEqual(["satzung"]);
  });
});
