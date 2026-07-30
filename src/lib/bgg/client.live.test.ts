import { describe, expect, it } from "vitest";
import { fetchBggGame } from "./client";

/**
 * Unlike client.test.ts (which mocks fetch with local XML fixtures), this hits
 * the real boardgamegeek.com API. It's the only test that can catch a change
 * on BGG's side — e.g. an added auth requirement — that the mocked tests are
 * structurally blind to. Skip in normal CI runs (network-dependent); run
 * explicitly to verify the live integration: `vitest run client.live.test.ts`.
 */
describe.skipIf(!!process.env.CI)("fetchBggGame — live BGG API", () => {
  it("imports a well-known game (Ark Nova, id 342942) from the real API", async () => {
    const result = await fetchBggGame(342942);

    expect(result.title).toBe("Ark Nova");
    expect(result.minPlayers).toBeGreaterThan(0);
  });
});
