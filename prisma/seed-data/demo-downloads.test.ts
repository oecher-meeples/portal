import { describe, expect, it } from "vitest";
import { DEMO_DOWNLOADS } from "./demo-downloads";

describe("DEMO_DOWNLOADS", () => {
  it("has exactly 4 entries", () => {
    expect(DEMO_DOWNLOADS).toHaveLength(4);
  });

  it("has unique fileKeys, used as the upsert key for idempotent seeding", () => {
    const fileKeys = DEMO_DOWNLOADS.map((d) => d.fileKey);
    expect(new Set(fileKeys).size).toBe(fileKeys.length);
  });

  it("has a positive file size and a PDF/XLSX fileType for every entry", () => {
    for (const download of DEMO_DOWNLOADS) {
      expect(download.fileSizeBytes).toBeGreaterThan(0);
      expect(["PDF", "XLSX"]).toContain(download.fileType);
    }
  });
});
