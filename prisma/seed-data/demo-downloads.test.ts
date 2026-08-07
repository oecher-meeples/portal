import { describe, expect, it } from "vitest";
import { DEMO_DOWNLOADS } from "./demo-downloads";

describe("DEMO_DOWNLOADS", () => {
  it("has exactly 4 entries", () => {
    expect(DEMO_DOWNLOADS).toHaveLength(4);
  });

  it("has unique fileUrls, used as the upsert key for idempotent seeding", () => {
    const fileUrls = DEMO_DOWNLOADS.map((d) => d.fileUrl);
    expect(new Set(fileUrls).size).toBe(fileUrls.length);
  });

  it("has a positive file size and a PDF/XLSX fileType for every entry", () => {
    for (const download of DEMO_DOWNLOADS) {
      expect(download.fileSizeBytes).toBeGreaterThan(0);
      expect(["PDF", "XLSX"]).toContain(download.fileType);
    }
  });
});
