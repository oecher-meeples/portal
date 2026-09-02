import { beforeEach, describe, expect, it, vi } from "vitest";

const runYearTurnCronMock = vi.fn();
vi.mock("@/lib/members/year-turn-cron", () => ({
  runYearTurnCron: (...args: unknown[]) => runYearTurnCronMock(...args),
}));

const { GET } = await import("./route");

describe("GET /api/cron/year-turn", () => {
  beforeEach(() => {
    runYearTurnCronMock.mockReset();
    runYearTurnCronMock.mockResolvedValue({
      stufe2: { anonymised: 0, blocked: [] },
      stufe3: { deleted: 0, blocked: [] },
    });
    process.env.CRON_SECRET = "test-secret";
  });

  it("fails closed with 500 when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;
    const request = new Request("https://example.com/api/cron/year-turn", {
      headers: { authorization: "Bearer undefined" },
    });

    const response = await GET(request);

    expect(response.status).toBe(500);
    expect(runYearTurnCronMock).not.toHaveBeenCalled();
  });

  it("rejects requests without a valid bearer token", async () => {
    const request = new Request("https://example.com/api/cron/year-turn");

    const response = await GET(request);

    expect(response.status).toBe(401);
    expect(runYearTurnCronMock).not.toHaveBeenCalled();
  });

  it("runs the cron and returns the summary with a valid bearer token", async () => {
    const request = new Request("https://example.com/api/cron/year-turn", {
      headers: { authorization: "Bearer test-secret" },
    });

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(runYearTurnCronMock).toHaveBeenCalledTimes(1);
    expect(body).toEqual({
      stufe2: { anonymised: 0, blocked: [] },
      stufe3: { deleted: 0, blocked: [] },
    });
  });
});
