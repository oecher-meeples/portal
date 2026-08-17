import { afterEach, describe, expect, it, vi } from "vitest";
import { TranslationApiError, translateToGerman } from "./translate";

function mockFetchOnce(ok: boolean, status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("translateToGerman", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("returns the translated text from a successful MyMemory response", async () => {
    mockFetchOnce(true, 200, {
      responseStatus: 200,
      responseData: { translatedText: "Baue einen modernen Zoo." },
    });

    const result = await translateToGerman("Build a modern zoo.");

    expect(result).toBe("Baue einen modernen Zoo.");
  });

  it("requests no API key — just text and language pair", async () => {
    const fetchMock = mockFetchOnce(true, 200, {
      responseStatus: 200,
      responseData: { translatedText: "…" },
    });

    await translateToGerman("Build a modern zoo.");

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://api.mymemory.translated.net/get?q=Build+a+modern+zoo.&langpair=en%7Cde",
    );
    expect(options.headers).toBeUndefined();
  });

  it("adds the optional contact email to raise the daily quota", async () => {
    vi.stubEnv("TRANSLATION_CONTACT_EMAIL", "kontakt@oecher-meeples.org");
    const fetchMock = mockFetchOnce(true, 200, {
      responseStatus: 200,
      responseData: { translatedText: "…" },
    });

    await translateToGerman("Build a modern zoo.");

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("de=kontakt%40oecher-meeples.org");
  });

  it("returns the input unchanged and skips the API call for blank text", async () => {
    const fetchMock = mockFetchOnce(true, 200, {});

    const result = await translateToGerman("   ");

    expect(result).toBe("   ");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws TranslationApiError for a non-2xx HTTP response", async () => {
    mockFetchOnce(false, 456, {});

    await expect(translateToGerman("Build a modern zoo.")).rejects.toThrow(
      TranslationApiError,
    );
  });

  it("throws TranslationApiError when the daily quota is exhausted (HTTP 200, responseStatus != 200)", async () => {
    mockFetchOnce(true, 200, {
      responseStatus: 403,
      responseData: { translatedText: "MYMEMORY WARNING: DAILY LIMIT" },
    });

    await expect(translateToGerman("Build a modern zoo.")).rejects.toThrow(
      TranslationApiError,
    );
  });

  it("translates a fetch timeout into a readable TranslationApiError", async () => {
    const timeoutError = new Error("The operation was aborted");
    timeoutError.name = "TimeoutError";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(timeoutError));

    await expect(translateToGerman("Build a modern zoo.")).rejects.toThrow(
      "Die Anfrage an den Übersetzungsdienst hat zu lange gedauert.",
    );
  });

  it("falls back to the original text when the response has no translation", async () => {
    mockFetchOnce(true, 200, { responseStatus: 200, responseData: {} });

    const result = await translateToGerman("Build a modern zoo.");

    expect(result).toBe("Build a modern zoo.");
  });
});
