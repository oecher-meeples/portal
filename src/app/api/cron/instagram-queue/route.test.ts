import { beforeEach, describe, expect, it, vi } from "vitest";

const processQueueMock = vi.fn();
vi.mock("@/lib/instagram/queue", () => ({
  processQueue: (...args: unknown[]) => processQueueMock(...args),
}));

const { GET } = await import("./route");

describe("GET /api/cron/instagram-queue", () => {
  beforeEach(() => {
    processQueueMock.mockReset();
    process.env.CRON_SECRET = "test-secret";
  });

  it("rejects requests without a valid bearer token", async () => {
    const request = new Request("https://example.com/api/cron/instagram-queue");

    const response = await GET(request);

    expect(response.status).toBe(401);
    expect(processQueueMock).not.toHaveBeenCalled();
  });

  it("rejects requests with the wrong bearer token", async () => {
    const request = new Request(
      "https://example.com/api/cron/instagram-queue",
      { headers: { authorization: "Bearer wrong-secret" } },
    );

    const response = await GET(request);

    expect(response.status).toBe(401);
    expect(processQueueMock).not.toHaveBeenCalled();
  });

  it("processes the queue and returns the summary with a valid bearer token", async () => {
    processQueueMock.mockResolvedValue({
      processed: 2,
      succeeded: 1,
      failed: 1,
    });
    const request = new Request(
      "https://example.com/api/cron/instagram-queue",
      { headers: { authorization: "Bearer test-secret" } },
    );

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(processQueueMock).toHaveBeenCalledTimes(1);
    expect(body).toEqual({ processed: 2, succeeded: 1, failed: 1 });
  });
});
