import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMarketDigestMock = vi.fn();
vi.mock("@/lib/newsletter/market-digest", () => ({
  sendMarketDigest: (...args: unknown[]) => sendMarketDigestMock(...args),
}));

const { GET } = await import("./route");

describe("GET /api/cron/market-digest", () => {
  beforeEach(() => {
    sendMarketDigestMock.mockReset();
    sendMarketDigestMock.mockResolvedValue({
      newListings: 0,
      recipients: 0,
      succeeded: 0,
      failed: 0,
    });
    process.env.CRON_SECRET = "test-secret";
  });

  it("fails closed with 500 when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;
    const request = new Request("https://example.com/api/cron/market-digest", {
      headers: { authorization: "Bearer undefined" },
    });

    const response = await GET(request);

    expect(response.status).toBe(500);
    expect(sendMarketDigestMock).not.toHaveBeenCalled();
  });

  it("rejects requests without a valid bearer token", async () => {
    const request = new Request("https://example.com/api/cron/market-digest");

    const response = await GET(request);

    expect(response.status).toBe(401);
    expect(sendMarketDigestMock).not.toHaveBeenCalled();
  });

  it("sends the digest and returns the summary with a valid bearer token", async () => {
    sendMarketDigestMock.mockResolvedValue({
      newListings: 2,
      recipients: 3,
      succeeded: 3,
      failed: 0,
    });
    const request = new Request("https://example.com/api/cron/market-digest", {
      headers: { authorization: "Bearer test-secret" },
    });

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(sendMarketDigestMock).toHaveBeenCalledTimes(1);
    expect(body).toEqual({
      newListings: 2,
      recipients: 3,
      succeeded: 3,
      failed: 0,
    });
  });
});
