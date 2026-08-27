import { describe, expect, it } from "vitest";
import {
  formatBytes,
  formatDate,
  formatDateShort,
  formatTimeRange,
  formatWeekdayDate,
  formatWeekdayDateTimeRange,
} from "@/lib/utils/format";

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

describe("formatWeekdayDate", () => {
  it("formats an ISO date as '<Wochentag>, den dd.mm.'", () => {
    expect(formatWeekdayDate("2026-08-27")).toBe("Donnerstag, den 27.08.");
  });
});

describe("formatWeekdayDateTimeRange", () => {
  it("formats as '<Wochentag> dd.mm, HH:mm – HH:mm'", () => {
    expect(
      formatWeekdayDateTimeRange("2026-08-27T18:00:00", "2026-08-27T22:00:00"),
    ).toBe("Donnerstag 27.08, 18:00 – 22:00");
  });
});

describe("formatTimeRange", () => {
  it("formats a pure time-of-day range without any date", () => {
    expect(formatTimeRange("2026-10-16T10:00:00", "2026-10-16T12:00:00")).toBe(
      "10:00 – 12:00",
    );
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
