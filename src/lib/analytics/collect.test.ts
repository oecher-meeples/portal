// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const {
  MAX_BODY_LENGTH,
  MAX_PATH_LENGTH,
  categorizeUserAgent,
  isCrossSiteRequest,
  parsePageViewBeacon,
  readBeaconBody,
  recordPageView,
  sanitizePath,
  sanitizeReferrer,
  visitorOptedOut,
} = await import("./collect");

const CHROME_DESKTOP =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";
const SAFARI_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1";

describe("sanitizePath", () => {
  it.each(["/", "/ludothek", "/news/mein-artikel", "/markt/%C3%A4"])(
    "accepts the plain path %s",
    (path) => {
      expect(sanitizePath(path)).toBe(path);
    },
  );

  it("strips a trailing slash so /news and /news/ count together", () => {
    expect(sanitizePath("/news/")).toBe("/news");
  });

  it.each([
    ["not a string", 42],
    ["empty", ""],
    ["relative", "ludothek"],
    ["absolute URL", "https://evil.example/"],
    ["protocol-relative", "//evil.example/x"],
    ["query string", "/passwort-vergessen?token=secret"],
    ["fragment", "/news#top"],
    ["whitespace", "/news <script>"],
    ["control char", "/news\n"],
    ["api route", "/api/analytics/collect"],
    ["next internals", "/_next/static/chunk.js"],
  ])("rejects %s", (_, path) => {
    expect(sanitizePath(path)).toBeNull();
  });

  it("rejects absurdly long paths", () => {
    expect(sanitizePath(`/${"a".repeat(MAX_PATH_LENGTH)}`)).toBeNull();
  });
});

describe("sanitizeReferrer", () => {
  it("keeps only the host of an external referrer", () => {
    expect(
      sanitizeReferrer("https://www.Google.de/search?q=meeples", "portal.de"),
    ).toBe("google.de");
  });

  it("drops the own host (internal navigation), ignoring port and www", () => {
    expect(
      sanitizeReferrer("https://www.portal.de/ludothek", "portal.de:443"),
    ).toBeNull();
  });

  it.each([
    ["missing", null],
    ["empty", ""],
    ["unparsable", "not a url"],
    ["non-http scheme", "android-app://com.google.android.gm/"],
    ["too long", `https://x.de/${"a".repeat(2000)}`],
  ])("returns null for a %s referrer", (_, value) => {
    expect(sanitizeReferrer(value, "portal.de")).toBeNull();
  });

  it("keeps an external referrer when the own host is unknown", () => {
    expect(sanitizeReferrer("https://t.me/oecher", null)).toBe("t.me");
  });
});

describe("categorizeUserAgent", () => {
  it.each([
    [CHROME_DESKTOP, "Chrome", "Desktop"],
    [SAFARI_IPHONE, "Safari", "Mobil"],
    [
      "Mozilla/5.0 (iPad; CPU OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1",
      "Safari",
      "Tablet",
    ],
    [
      "Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
      "Chrome",
      "Tablet",
    ],
    [
      "Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36",
      "Samsung Internet",
      "Mobil",
    ],
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0",
      "Edge",
      "Desktop",
    ],
    [
      "Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0",
      "Firefox",
      "Desktop",
    ],
    [
      "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 OPR/114.0.0.0",
      "Opera",
      "Desktop",
    ],
    ["SomeExoticClient/1.0", "Andere", "Desktop"],
  ])("maps %s to %s/%s", (userAgent, browser, device) => {
    expect(categorizeUserAgent(userAgent)).toEqual({ browser, device });
  });

  it.each([
    null,
    "",
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "curl/8.5.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/129.0.0.0 Safari/537.36",
  ])("does not count %s as a visitor", (userAgent) => {
    expect(categorizeUserAgent(userAgent)).toBeNull();
  });
});

describe("parsePageViewBeacon", () => {
  const base = { userAgent: CHROME_DESKTOP, host: "portal.de" };

  it("returns only sanitized, coarse fields — never the raw user agent", () => {
    const result = parsePageViewBeacon({
      ...base,
      body: JSON.stringify({
        path: "/ludothek/",
        referrer: "https://www.instagram.com/p/xyz?igshid=abc",
        ip: "1.2.3.4",
        userAgent: CHROME_DESKTOP,
      }),
    });

    expect(result).toEqual({
      path: "/ludothek",
      referrer: "instagram.com",
      browser: "Chrome",
      device: "Desktop",
    });
  });

  it.each([
    ["empty body", ""],
    ["too large body", "x".repeat(MAX_BODY_LENGTH + 1)],
    ["invalid JSON", "{nope"],
    ["JSON null", "null"],
    ["JSON string", '"/ludothek"'],
    ["missing path", JSON.stringify({ referrer: null })],
    ["invalid path", JSON.stringify({ path: "javascript:alert(1)" })],
  ])("rejects a beacon with %s", (_, body) => {
    expect(parsePageViewBeacon({ ...base, body })).toBeNull();
  });

  it("rejects beacons from bots", () => {
    expect(
      parsePageViewBeacon({
        body: JSON.stringify({ path: "/" }),
        userAgent: "Googlebot/2.1",
        host: "portal.de",
      }),
    ).toBeNull();
  });
});

describe("readBeaconBody", () => {
  function post(body: BodyInit | null, headers: HeadersInit = {}) {
    return new Request("https://portal.de/api/analytics/collect", {
      method: "POST",
      body,
      headers,
    });
  }

  it("reads a small body", async () => {
    await expect(readBeaconBody(post('{"path":"/"}'))).resolves.toBe(
      '{"path":"/"}',
    );
  });

  it("returns an empty string without a body", async () => {
    await expect(readBeaconBody(post(null))).resolves.toBe("");
  });

  it("refuses a declared oversized body without reading it", async () => {
    await expect(
      readBeaconBody(post("{}", { "content-length": "999999" })),
    ).resolves.toBeNull();
  });

  it("stops reading a streamed body once it exceeds the limit", async () => {
    const chunk = new TextEncoder().encode("x".repeat(1024));
    let pulls = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulls += 1;
        controller.enqueue(chunk); // endless stream
      },
    });
    const request = new Request("https://portal.de/api/analytics/collect", {
      method: "POST",
      body: stream,
      // @ts-expect-error — Node's fetch requires `duplex` for stream bodies
      duplex: "half",
    });

    await expect(readBeaconBody(request)).resolves.toBeNull();
    expect(pulls).toBeLessThan(10);
  });
});

describe("request header guards", () => {
  it("detects cross-site beacons", () => {
    expect(
      isCrossSiteRequest(new Headers({ "sec-fetch-site": "cross-site" })),
    ).toBe(true);
    expect(
      isCrossSiteRequest(new Headers({ "sec-fetch-site": "same-origin" })),
    ).toBe(false);
    expect(isCrossSiteRequest(new Headers())).toBe(false);
  });

  it("honours Do Not Track and Global Privacy Control", () => {
    expect(visitorOptedOut(new Headers({ dnt: "1" }))).toBe(true);
    expect(visitorOptedOut(new Headers({ "sec-gpc": "1" }))).toBe(true);
    expect(visitorOptedOut(new Headers({ dnt: "0" }))).toBe(false);
  });
});

describe("recordPageView", () => {
  it("writes exactly the sanitized fields", async () => {
    const input = {
      path: "/news",
      referrer: null,
      browser: "Firefox",
      device: "Mobil",
    };
    await recordPageView(input);
    expect(prismaMock.pageView.create).toHaveBeenCalledWith({ data: input });
  });
});
