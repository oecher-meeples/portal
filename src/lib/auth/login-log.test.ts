import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const getRequestIpMock = vi.fn();
vi.mock("@/lib/utils/request-ip", () => ({
  getRequestIp: () => getRequestIpMock(),
}));

const headersMock = vi.fn();
vi.mock("next/headers", () => ({ headers: () => headersMock() }));

const {
  loginLogCutoff,
  deleteExpiredLoginLogs,
  logAdminLoginOnce,
  getRecentAdminLogins,
} = await import("./login-log");

beforeEach(() => {
  getRequestIpMock.mockResolvedValue("1.2.3.4");
  headersMock.mockResolvedValue(new Map([["user-agent", "test-agent"]]));
  prismaMock.loginLog.findFirst.mockResolvedValue(null);
});

describe("loginLogCutoff", () => {
  it("is exactly 24 months before the given moment", () => {
    expect(loginLogCutoff(new Date("2026-07-29T12:00:00Z")).toISOString()).toBe(
      "2024-07-29T12:00:00.000Z",
    );
  });
});

describe("deleteExpiredLoginLogs", () => {
  it("deletes only entries older than 24 months", async () => {
    prismaMock.loginLog.deleteMany.mockResolvedValue({ count: 4 } as never);

    const result = await deleteExpiredLoginLogs(
      new Date("2026-07-29T12:00:00Z"),
    );

    expect(result).toEqual({ deleted: 4 });
    expect(prismaMock.loginLog.deleteMany).toHaveBeenCalledWith({
      where: { at: { lt: new Date("2024-07-29T12:00:00.000Z") } },
    });
  });
});

describe("logAdminLoginOnce", () => {
  it("writes exactly one entry for a not-yet-logged session", async () => {
    const createdAt = new Date("2026-08-31T08:00:00Z");

    await logAdminLoginOnce("user-1", createdAt);

    expect(prismaMock.loginLog.create).toHaveBeenCalledWith({
      data: {
        neonAuthUserId: "user-1",
        at: createdAt,
        ipAddress: "1.2.3.4",
        userAgent: "test-agent",
      },
    });
  });

  it("does not write a second entry for a session already logged", async () => {
    prismaMock.loginLog.findFirst.mockResolvedValue({
      id: "log-1",
    } as never);

    await logAdminLoginOnce("user-1", new Date("2026-08-31T08:00:00Z"));

    expect(prismaMock.loginLog.create).not.toHaveBeenCalled();
  });
});

describe("getRecentAdminLogins", () => {
  it("returns the most recent entries first", async () => {
    prismaMock.loginLog.findMany.mockResolvedValue([]);

    await getRecentAdminLogins(10);

    expect(prismaMock.loginLog.findMany).toHaveBeenCalledWith({
      orderBy: { at: "desc" },
      take: 10,
    });
  });
});
