import { describe, expect, it } from "vitest";
import { LEGAL_DOCS } from "../../src/data/downloads";
import { DEMO_LEGAL_DOCUMENTS } from "./demo-legal-documents";

describe("DEMO_LEGAL_DOCUMENTS", () => {
  it("has exactly the fixed LEGAL_DOCS slugs", () => {
    const slugs = DEMO_LEGAL_DOCUMENTS.map((doc) => doc.slug);
    const fixedSlugs = LEGAL_DOCS.map((doc) => doc.slug);
    expect(slugs.sort()).toEqual([...fixedSlugs].sort());
  });

  it("has a non-empty sections list for every entry", () => {
    for (const doc of DEMO_LEGAL_DOCUMENTS) {
      expect(doc.sections.length).toBeGreaterThan(0);
    }
  });

  it("starts with no pdfFileUrl for every entry", () => {
    for (const doc of DEMO_LEGAL_DOCUMENTS) {
      expect(doc.pdfFileUrl).toBeNull();
    }
  });
});
