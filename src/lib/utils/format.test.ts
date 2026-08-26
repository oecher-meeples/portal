import { describe, expect, it } from "vitest";
import { formatBytes, formatDate, formatDateShort } from "@/lib/utils/format";

describe("formatDate", () => {
  it("formats an ISO date as dd.mm.yyyy", () => {
    expect(formatDate("2026-08-01")).toBe("01.08.2026");
  });
});

describe("formatDateShort", () => {
  it("formats an ISO date as dd.mm", () => {
    expect(formatDateShort("2026-08-01")).toBe("01.08.");
  });
});

describe("formatBytes", () => {
  it("keeps small values in bytes", () => {
    expect(formatBytes(512)).toBe("512 B");
  });

  it("formats kilobytes with one decimal", () => {
    expect(formatBytes(1536)).toBe("1,5 KB");
  });

  it("formats gigabytes with one decimal", () => {
    expect(formatBytes(5 * 1024 * 1024 * 1024)).toBe("5 GB");
  });
});
