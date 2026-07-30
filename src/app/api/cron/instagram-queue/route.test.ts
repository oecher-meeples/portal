import { beforeEach, describe, expect, it, vi } from "vitest";

const processQueueMock = vi.fn();
const refreshConnectionIfNeededMock = vi.fn();
vi.mock("@/lib/instagram/queue", () => ({
  processQueue: (...args: unknown[]) => processQueueMock(...args),
  refreshConnectionIfNeeded: (...args: unknown[]) =>
    refreshConnectionIfNeededMock(...args),
}));

const deleteExpiredBankDataAccessLogsMock = vi.fn();
vi.mock("@/lib/members/bank-access-log", () => ({
  deleteExpiredBankDataAccessLogs: (...args: unknown[]) =>
    deleteExpiredBankDataAccessLogsMock(...args),
}));

const { GET } = await import("./route");

describe("GET /api/cron/instagram-queue", () => {
  beforeEach(() => {
    processQueueMock.mockReset();
    refreshConnectionIfNeededMock.mockReset();
    deleteExpiredBankDataAccessLogsMock.mockReset();
    deleteExpiredBankDataAccessLogsMock.mockResolvedValue({ deleted: 0 });
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
    expect(refreshConnectionIfNeededMock).toHaveBeenCalledTimes(1);
    expect(processQueueMock).toHaveBeenCalledTimes(1);
    expect(body).toEqual({
      processed: 2,
      succeeded: 1,
      failed: 1,
      bankLogCleanup: { deleted: 0 },
    });
  });

  it("prunes expired bank data access logs on every run", async () => {
    processQueueMock.mockResolvedValue({ processed: 0 });
    deleteExpiredBankDataAccessLogsMock.mockResolvedValue({ deleted: 3 });
    const request = new Request(
      "https://example.com/api/cron/instagram-queue",
      { headers: { authorization: "Bearer test-secret" } },
    );

    const body = await (await GET(request)).json();

    expect(deleteExpiredBankDataAccessLogsMock).toHaveBeenCalledTimes(1);
    expect(body.bankLogCleanup).toEqual({ deleted: 3 });
  });

  it("does not prune when the request is unauthorized", async () => {
    const request = new Request("https://example.com/api/cron/instagram-queue");

    await GET(request);

    expect(deleteExpiredBankDataAccessLogsMock).not.toHaveBeenCalled();
  });
});
