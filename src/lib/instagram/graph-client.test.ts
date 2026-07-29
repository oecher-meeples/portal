import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  InstagramApiError,
  createMediaContainer,
  exchangeCodeForShortLivedToken,
  getInstagramBusinessAccount,
  getLongLivedToken,
  publishMedia,
  refreshLongLivedToken,
} from "@/lib/instagram/graph-client";

function loadFixture(name: string): unknown {
  const raw = fs.readFileSync(
    path.join(__dirname, "..", "__fixtures__", "instagram", name),
    "utf-8",
  );
  return JSON.parse(raw);
}

function mockFetchOnce(ok: boolean, status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("graph-client", () => {
  beforeEach(() => {
    process.env.META_APP_ID = "test-app-id";
    process.env.META_APP_SECRET = "test-app-secret";
    process.env.META_REDIRECT_URI = "https://example.com/callback";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("exchangeCodeForShortLivedToken", () => {
    it("returns the access token on success", async () => {
      mockFetchOnce(true, 200, loadFixture("oauth-token-success.json"));

      const result = await exchangeCodeForShortLivedToken("auth-code");

      expect(result.accessToken).toBe("EAAG...longlivedtoken...");
      expect(result.expiresInSeconds).toBe(5183944);
    });

    it("throws InstagramApiError on failure", async () => {
      mockFetchOnce(false, 429, loadFixture("error-rate-limit.json"));

      await expect(exchangeCodeForShortLivedToken("auth-code")).rejects.toThrow(
        InstagramApiError,
      );
    });
  });

  describe("getLongLivedToken", () => {
    it("returns the access token on success", async () => {
      mockFetchOnce(true, 200, loadFixture("oauth-token-success.json"));

      const result = await getLongLivedToken("short-lived-token");

      expect(result.accessToken).toBe("EAAG...longlivedtoken...");
    });

    it("throws InstagramApiError on failure", async () => {
      mockFetchOnce(false, 429, loadFixture("error-rate-limit.json"));

      await expect(getLongLivedToken("short-lived-token")).rejects.toThrow(
        InstagramApiError,
      );
    });
  });

  describe("refreshLongLivedToken", () => {
    it("returns the refreshed access token on success", async () => {
      mockFetchOnce(true, 200, loadFixture("oauth-token-success.json"));

      const result = await refreshLongLivedToken("current-token");

      expect(result.accessToken).toBe("EAAG...longlivedtoken...");
    });

    it("throws InstagramApiError on failure", async () => {
      mockFetchOnce(false, 401, loadFixture("error-rate-limit.json"));

      await expect(refreshLongLivedToken("current-token")).rejects.toThrow(
        InstagramApiError,
      );
    });
  });

  describe("createMediaContainer", () => {
    it("returns the creation id on success", async () => {
      mockFetchOnce(true, 200, loadFixture("media-container-success.json"));

      const result = await createMediaContainer({
        igBusinessAccountId: "17841400000000000",
        imageUrl: "https://example.com/cover.png",
        caption: "Neuer Beitrag",
        accessToken: "token",
      });

      expect(result.creationId).toBe("17895695668004550");
    });

    it("throws InstagramApiError with meta error details on failure", async () => {
      mockFetchOnce(false, 429, loadFixture("error-rate-limit.json"));

      await expect(
        createMediaContainer({
          igBusinessAccountId: "17841400000000000",
          imageUrl: "https://example.com/cover.png",
          caption: "Neuer Beitrag",
          accessToken: "token",
        }),
      ).rejects.toMatchObject({
        code: 4,
        type: "OAuthException",
      });
    });
  });

  describe("getInstagramBusinessAccount", () => {
    it("returns the page and ig business account ids on success", async () => {
      mockFetchOnce(true, 200, loadFixture("pages-with-ig-account.json"));

      const result = await getInstagramBusinessAccount("token");

      expect(result).toEqual({
        pageId: "102345678901234",
        igBusinessAccountId: "17841400000000000",
      });
    });

    it("throws when no page has a linked instagram business account", async () => {
      mockFetchOnce(true, 200, loadFixture("pages-without-ig-account.json"));

      await expect(getInstagramBusinessAccount("token")).rejects.toThrow(
        InstagramApiError,
      );
    });

    it("throws InstagramApiError on failure", async () => {
      mockFetchOnce(false, 401, loadFixture("error-rate-limit.json"));

      await expect(getInstagramBusinessAccount("token")).rejects.toThrow(
        InstagramApiError,
      );
    });
  });

  describe("publishMedia", () => {
    it("returns the media id on success", async () => {
      mockFetchOnce(true, 200, loadFixture("publish-success.json"));

      const result = await publishMedia({
        igBusinessAccountId: "17841400000000000",
        creationId: "17895695668004550",
        accessToken: "token",
      });

      expect(result.mediaId).toBe("17846425932058173");
    });

    it("throws InstagramApiError on failure", async () => {
      mockFetchOnce(false, 500, loadFixture("error-rate-limit.json"));

      await expect(
        publishMedia({
          igBusinessAccountId: "17841400000000000",
          creationId: "17895695668004550",
          accessToken: "token",
        }),
      ).rejects.toThrow(InstagramApiError);
    });
  });
});
