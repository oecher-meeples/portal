import { describe, expect, it } from "vitest";
import { playersAndDuration } from "./format";

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
