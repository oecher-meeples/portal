import { describe, expect, it } from "vitest";
import { formatDate, formatDateShort } from "@/lib/format";

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
