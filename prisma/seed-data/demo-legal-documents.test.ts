import { describe, expect, it } from "vitest";
import { DEMO_LEGAL_DOCUMENTS } from "./demo-legal-documents";

const FIXED_SLUGS = ["satzung", "datenschutz", "impressum", "beitragsordnung"];

describe("DEMO_LEGAL_DOCUMENTS", () => {
  it("has exactly the four fixed slugs", () => {
    const slugs = DEMO_LEGAL_DOCUMENTS.map((doc) => doc.slug);
    expect(slugs.sort()).toEqual([...FIXED_SLUGS].sort());
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
