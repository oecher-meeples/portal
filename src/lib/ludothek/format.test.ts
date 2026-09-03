import { describe, expect, it } from "vitest";
import { formatDurationHours, playersAndDuration } from "./format";

describe("playersAndDuration", () => {
  it("formats a player range and duration", () => {
    expect(
      playersAndDuration({
        minPlayers: 1,
        maxPlayers: 4,
        playTimeMinutes: 90,
      } as never),
    ).toBe("1–4 Spieler · 90’");
  });

  it("falls back to a single known player count", () => {
    expect(
      playersAndDuration({
        minPlayers: null,
        maxPlayers: 4,
        playTimeMinutes: null,
      } as never),
    ).toBe("4 Spieler");
  });

  it("shows a placeholder when neither player count is known", () => {
    expect(
      playersAndDuration({
        minPlayers: null,
        maxPlayers: null,
        playTimeMinutes: 30,
      } as never),
    ).toBe("? Spieler · 30’");
  });
});

describe("formatDurationHours (#427)", () => {
  it("formats zero minutes", () => {
    expect(formatDurationHours(0)).toBe("0:00h");
  });

  it("pads minutes below ten", () => {
    expect(formatDurationHours(90)).toBe("1:30h");
    expect(formatDurationHours(65)).toBe("1:05h");
  });

  it("formats durations above one hour", () => {
    expect(formatDurationHours(1020)).toBe("17:00h");
  });
});
