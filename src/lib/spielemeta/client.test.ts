import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { lookupGameByEan, searchGamesByName, SpielemetaError } from "./client";

const fetchMock = vi.fn();
const VALID_EAN = "4015566600225";
const TEST_KEY = "test-key";

function jsonResponse(body: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => body };
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("EAN_API_KEY", TEST_KEY);
  vi.stubEnv("SPIELEMETA_BASE_URL", "");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  fetchMock.mockReset();
});

describe("searchGamesByName", () => {
  it("maps hits and sends the bearer key", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        games: [
          {
            EAN: VALID_EAN,
            NAME: "Die Siedler von Catan",
            YEAR: 2020,
            VERLAG: "Kosmos",
            HERAUSGEBER: "Anderer",
            PARENTEAN: "0",
          },
        ],
      }),
    );

    const results = await searchGamesByName("Catan");

    expect(results).toEqual([
      {
        ean: VALID_EAN,
        title: "Die Siedler von Catan",
        brand: "Kosmos",
        year: 2020,
      },
    ]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://spielemeta.rodnoc.dev/api/v1/search/games?name=Catan&limit=25&offset=0",
    );
    expect(init.headers).toEqual({ Authorization: `Bearer ${TEST_KEY}` });
  });

  it("decodes html entities in names and publishers", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        games: [
          {
            EAN: VALID_EAN,
            NAME: "The Others - V&ouml;llerei &bull; Erweiterung DE",
            VERLAG: "Kosmos &amp; Co",
          },
        ],
      }),
    );

    const [hit] = await searchGamesByName("Others");
    expect(hit.title).toBe("The Others - Völlerei • Erweiterung DE");
    expect(hit.brand).toBe("Kosmos & Co");
  });

  it("falls back from VERLAG to HERAUSGEBER", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        games: [
          { EAN: VALID_EAN, NAME: "Catan", VERLAG: "", HERAUSGEBER: "Kosmos" },
        ],
      }),
    );

    expect((await searchGamesByName("Catan"))[0].brand).toBe("Kosmos");
  });

  it("returns an empty list when nothing matches", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ games: [] }));
    expect(await searchGamesByName("Unbekannt")).toEqual([]);
  });

  it("skips the request for names shorter than three characters", async () => {
    expect(await searchGamesByName(" ab ")).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("drops hits with an invalid EAN and duplicates", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        games: [
          { EAN: "4015566600221", NAME: "Falsche Prüfziffer" },
          { EAN: VALID_EAN, NAME: "Catan" },
          { EAN: VALID_EAN, NAME: "Catan (Dublette)" },
        ],
      }),
    );

    const results = await searchGamesByName("Catan");
    expect(results.map((r) => r.title)).toEqual(["Catan"]);
  });

  it.each([400, 401, 500, 503])(
    "throws SpielemetaError on HTTP %i",
    async (status) => {
      fetchMock.mockResolvedValue(jsonResponse({}, status));

      await expect(searchGamesByName("Catan")).rejects.toMatchObject({
        name: "SpielemetaError",
        status,
      });
    },
  );

  it("maps a timeout to a SpielemetaError", async () => {
    const timeout = new Error("timeout");
    timeout.name = "TimeoutError";
    fetchMock.mockRejectedValue(timeout);

    await expect(searchGamesByName("Catan")).rejects.toThrow(
      "zu lange gedauert",
    );
  });

  it("maps a network failure to a SpielemetaError", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    await expect(searchGamesByName("Catan")).rejects.toBeInstanceOf(
      SpielemetaError,
    );
  });

  it("uses SPIELEMETA_BASE_URL when set", async () => {
    vi.stubEnv("SPIELEMETA_BASE_URL", "https://example.test/");
    fetchMock.mockResolvedValue(jsonResponse({ games: [] }));

    await searchGamesByName("Catan");

    expect(fetchMock.mock.calls[0][0]).toMatch(
      /^https:\/\/example\.test\/api\/v1\/search\/games\?/,
    );
  });

  it("fails loudly without the API key", async () => {
    vi.stubEnv("EAN_API_KEY", "");

    await expect(searchGamesByName("Catan")).rejects.toThrow("EAN_API_KEY");
  });
});

describe("lookupGameByEan", () => {
  it("returns the mapped game", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ EAN: VALID_EAN, NAME: "Catan", VERLAG: "Kosmos" }),
    );

    expect(await lookupGameByEan("4015-566600225")).toEqual({
      ean: VALID_EAN,
      title: "Catan",
      brand: "Kosmos",
    });
    expect(fetchMock.mock.calls[0][0]).toContain(`ean=${VALID_EAN}`);
  });

  it("maps the bare false literal to null", async () => {
    fetchMock.mockResolvedValue(jsonResponse(false));
    expect(await lookupGameByEan(VALID_EAN)).toBeNull();
  });
});
