import { describe, expect, it } from "vitest";
import { parseInviteCsv } from "./invite-csv";

describe("parseInviteCsv", () => {
  it("parses valid emails and deduplicates them", () => {
    const raw =
      "email\nerika@example.com\nmax@example.com\nerika@example.com\n";

    const result = parseInviteCsv(raw);

    expect(result.emails).toEqual(["erika@example.com", "max@example.com"]);
    expect(result.errors).toHaveLength(0);
  });

  it("collects a per-row error for an invalid email without aborting the rest", () => {
    const raw = "email\nerika@example.com\nnotanemail\nmax@example.com\n";

    const result = parseInviteCsv(raw);

    expect(result.emails).toEqual(["erika@example.com", "max@example.com"]);
    expect(result.errors).toHaveLength(1);
  });

  it("rejects an invalid header", () => {
    const result = parseInviteCsv("name,email\nErika,erika@example.com\n");

    expect(result.emails).toHaveLength(0);
    expect(result.errors).toEqual([
      { line: 1, message: "Ungültige Kopfzeile. Erwartet wird: email" },
    ]);
  });

  it("returns empty result for an empty file", () => {
    expect(parseInviteCsv("")).toEqual({ emails: [], errors: [] });
  });
});
