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

const deleteExpiredLoginLogsMock = vi.fn();
vi.mock("@/lib/auth/login-log", () => ({
  deleteExpiredLoginLogs: (...args: unknown[]) =>
    deleteExpiredLoginLogsMock(...args),
}));

const processNewsletterQueueMock = vi.fn();
vi.mock("@/lib/newsletter/dispatch", () => ({
  processNewsletterQueue: (...args: unknown[]) =>
    processNewsletterQueueMock(...args),
}));

const { GET } = await import("./route");

describe("GET /api/cron/instagram-queue", () => {
  beforeEach(() => {
    processQueueMock.mockReset();
    refreshConnectionIfNeededMock.mockReset();
    deleteExpiredBankDataAccessLogsMock.mockReset();
    deleteExpiredBankDataAccessLogsMock.mockResolvedValue({ deleted: 0 });
    deleteExpiredLoginLogsMock.mockReset();
    deleteExpiredLoginLogsMock.mockResolvedValue({ deleted: 0 });
    processNewsletterQueueMock.mockReset();
    processNewsletterQueueMock.mockResolvedValue({
      processed: 0,
      succeeded: 0,
      failed: 0,
    });
    process.env.CRON_SECRET = "test-secret";
  });

  it("fails closed with 500 when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;
    const request = new Request(
      "https://example.com/api/cron/instagram-queue",
      { headers: { authorization: "Bearer undefined" } },
    );

    const response = await GET(request);

    expect(response.status).toBe(500);
    expect(processQueueMock).not.toHaveBeenCalled();
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
      newsletter: { processed: 0, succeeded: 0, failed: 0 },
      bankLogCleanup: { deleted: 0 },
      loginLogCleanup: { deleted: 0 },
    });
  });

  it("processes the newsletter queue with the Brevo daily limit on every authorized run", async () => {
    processQueueMock.mockResolvedValue({
      processed: 0,
      succeeded: 0,
      failed: 0,
    });
    processNewsletterQueueMock.mockResolvedValue({
      processed: 5,
      succeeded: 4,
      failed: 1,
    });
    const request = new Request(
      "https://example.com/api/cron/instagram-queue",
      { headers: { authorization: "Bearer test-secret" } },
    );

    const body = await (await GET(request)).json();

    expect(processNewsletterQueueMock).toHaveBeenCalledWith(300);
    expect(body.newsletter).toEqual({ processed: 5, succeeded: 4, failed: 1 });
  });

  it("does not process the newsletter queue when the request is unauthorized", async () => {
    const request = new Request("https://example.com/api/cron/instagram-queue");

    await GET(request);

    expect(processNewsletterQueueMock).not.toHaveBeenCalled();
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
    expect(deleteExpiredLoginLogsMock).not.toHaveBeenCalled();
  });

  it("prunes expired login logs on every run (#231)", async () => {
    processQueueMock.mockResolvedValue({ processed: 0 });
    deleteExpiredLoginLogsMock.mockResolvedValue({ deleted: 5 });
    const request = new Request(
      "https://example.com/api/cron/instagram-queue",
      { headers: { authorization: "Bearer test-secret" } },
    );

    const body = await (await GET(request)).json();

    expect(deleteExpiredLoginLogsMock).toHaveBeenCalledTimes(1);
    expect(body.loginLogCleanup).toEqual({ deleted: 5 });
  });
});
