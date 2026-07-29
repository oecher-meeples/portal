import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Convention for mocking JSON-based `fetch` calls to external REST APIs
 * (as opposed to `src/lib/calendar.test.ts`, which mocks a plain-text ICS
 * response). Real usages live alongside the client that calls `fetch`,
 * e.g. `src/lib/instagram/graph-client.test.ts`.
 */
function loadFixture(name: string): unknown {
  const raw = fs.readFileSync(
    path.join(__dirname, "..", "__fixtures__", "instagram", name),
    "utf-8",
  );
  return JSON.parse(raw);
}

describe("fetch mocking convention", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("mocks global.fetch and resolves a json fixture", async () => {
    const fixture = loadFixture("media-container-success.json");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => fixture,
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await fetch("https://graph.facebook.com/v21.0/123/media");
    const body = await response.json();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(body).toEqual({ id: "17895695668004550" });
  });

  it("mocks a non-2xx error response with a meta error body", async () => {
    const fixture = loadFixture("error-rate-limit.json");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => fixture,
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await fetch(
      "https://graph.facebook.com/v21.0/123/media_publish",
    );

    expect(response.ok).toBe(false);
    expect(await response.json()).toMatchObject({
      error: { code: 4, type: "OAuthException" },
    });
  });
});
