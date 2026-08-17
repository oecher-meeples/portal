import { afterEach, describe, expect, it, vi } from "vitest";
import { UpcLookupError, searchEanByName } from "./client";

function mockFetchOnce(ok: boolean, status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("searchEanByName", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps hits to ean/title/brand", async () => {
    mockFetchOnce(true, 200, {
      code: "OK",
      total: 1,
      items: [
        {
          ean: "0850000576407",
          upc: "850000576407",
          title: "Capstone Games Ark Nova Strategy Board Game",
          brand: "Capstone Games",
        },
      ],
    });

    const result = await searchEanByName("Ark Nova");

    expect(result).toEqual([
      {
        ean: "0850000576407",
        title: "Capstone Games Ark Nova Strategy Board Game",
        brand: "Capstone Games",
      },
    ]);
  });

  it("falls back to upc when ean is missing", async () => {
    mockFetchOnce(true, 200, {
      items: [{ upc: "850000576407", title: "Ark Nova" }],
    });

    const result = await searchEanByName("Ark Nova");

    expect(result).toEqual([{ ean: "850000576407", title: "Ark Nova" }]);
  });

  it("skips items without any ean or upc", async () => {
    mockFetchOnce(true, 200, {
      items: [{ title: "Ark Nova, no barcode" }],
    });

    const result = await searchEanByName("Ark Nova");

    expect(result).toEqual([]);
  });

  it("deduplicates repeated EANs from multiple listings", async () => {
    mockFetchOnce(true, 200, {
      items: [
        { ean: "0850000576407", title: "Ark Nova (Seller A)" },
        { ean: "0850000576407", title: "Ark Nova (Seller B)" },
      ],
    });

    const result = await searchEanByName("Ark Nova");

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Ark Nova (Seller A)");
  });

  it("returns an empty array for zero hits", async () => {
    mockFetchOnce(true, 200, { total: 0, items: [] });

    const result = await searchEanByName("Ein Titel ohne Treffer");

    expect(result).toEqual([]);
  });

  it("returns an empty array without calling fetch for a blank query", async () => {
    const fetchMock = mockFetchOnce(true, 200, {});

    const result = await searchEanByName("   ");

    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the query as the s parameter, no API key needed", async () => {
    const fetchMock = mockFetchOnce(true, 200, { items: [] });

    await searchEanByName("Ark Nova");

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("s=Ark+Nova");
    expect(url).toContain("api.upcitemdb.com");
  });

  it("throws UpcLookupError for a non-2xx HTTP response", async () => {
    mockFetchOnce(false, 403, {});

    await expect(searchEanByName("Ark Nova")).rejects.toThrow(UpcLookupError);
  });

  it("translates a fetch timeout into a readable UpcLookupError", async () => {
    const timeoutError = new Error("The operation was aborted");
    timeoutError.name = "TimeoutError";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(timeoutError));

    await expect(searchEanByName("Ark Nova")).rejects.toThrow(
      "Die Anfrage an die EAN-Suche hat zu lange gedauert.",
    );
  });
});
