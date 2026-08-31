import { describe, expect, it } from "vitest";
import { anonymisedMeepleDisplayName } from "./anonymised-display-name";

describe("anonymisedMeepleDisplayName", () => {
  it("returns the raw displayName when not anonymised (e.g. the Sammelkonto)", () => {
    expect(
      anonymisedMeepleDisplayName(
        { id: "meeple-1", displayName: "Anonymer Meeple", anonymizedAt: null },
        true,
      ),
    ).toBe("Anonymer Meeple");
  });

  it("shows the plain generic name without games:manage", () => {
    expect(
      anonymisedMeepleDisplayName(
        {
          id: "meeple-1",
          displayName: "Anonymer Meeple",
          anonymizedAt: new Date("2026-01-01T00:00:00Z"),
        },
        false,
      ),
    ).toBe("Anonymer Meeple");
  });

  it("appends a stable 6-hex suffix for games:manage", () => {
    const result = anonymisedMeepleDisplayName(
      {
        id: "meeple-1",
        displayName: "Anonymer Meeple",
        anonymizedAt: new Date("2026-01-01T00:00:00Z"),
      },
      true,
    );

    expect(result).toMatch(/^Anonymer Meeple #[0-9a-f]{6}$/);
  });

  it("derives the same suffix for the same id every time", () => {
    const meeple = {
      id: "meeple-1",
      displayName: "Anonymer Meeple",
      anonymizedAt: new Date("2026-01-01T00:00:00Z"),
    };

    expect(anonymisedMeepleDisplayName(meeple, true)).toBe(
      anonymisedMeepleDisplayName(meeple, true),
    );
  });

  it("derives a different suffix for a different id", () => {
    const first = anonymisedMeepleDisplayName(
      {
        id: "meeple-1",
        displayName: "Anonymer Meeple",
        anonymizedAt: new Date("2026-01-01T00:00:00Z"),
      },
      true,
    );
    const second = anonymisedMeepleDisplayName(
      {
        id: "meeple-2",
        displayName: "Anonymer Meeple",
        anonymizedAt: new Date("2026-01-01T00:00:00Z"),
      },
      true,
    );

    expect(first).not.toBe(second);
  });
});
