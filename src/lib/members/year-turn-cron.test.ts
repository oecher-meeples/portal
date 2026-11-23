import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const anonymiseMeepleStufe2Mock = vi.fn();
const anonymiseMemberStufe3Mock = vi.fn();
const listMembersEligibleForStufe3Mock = vi.fn();
vi.mock("@/lib/members/anonymisation", () => ({
  anonymiseMeepleStufe2: (...args: unknown[]) =>
    anonymiseMeepleStufe2Mock(...args),
  anonymiseMemberStufe3: (...args: unknown[]) =>
    anonymiseMemberStufe3Mock(...args),
  listMembersEligibleForStufe3: (...args: unknown[]) =>
    listMembersEligibleForStufe3Mock(...args),
}));

const applyAusgetretenRoleMock = vi.fn();
vi.mock("@/lib/auth/ausgetreten-role", () => ({
  applyAusgetretenRole: (...args: unknown[]) =>
    applyAusgetretenRoleMock(...args),
}));

const sendTransactionalEmailMock = vi.fn();
vi.mock("@/lib/newsletter/mailer", () => ({
  sendTransactionalEmail: (...args: unknown[]) =>
    sendTransactionalEmailMock(...args),
}));

const { runYearTurnCron } = await import("@/lib/members/year-turn-cron");

const NOW = new Date("2027-01-02T02:00:00Z");

beforeEach(() => {
  anonymiseMeepleStufe2Mock.mockReset();
  anonymiseMeepleStufe2Mock.mockResolvedValue({ success: true });
  anonymiseMemberStufe3Mock.mockReset();
  anonymiseMemberStufe3Mock.mockResolvedValue({ success: true });
  listMembersEligibleForStufe3Mock.mockReset();
  listMembersEligibleForStufe3Mock.mockResolvedValue([]);
  applyAusgetretenRoleMock.mockReset();
  sendTransactionalEmailMock.mockReset();
  sendTransactionalEmailMock.mockResolvedValue(undefined);
  prismaMock.member.findMany.mockResolvedValue([] as never);
  prismaMock.storageUnit.count.mockResolvedValue(0);
  prismaMock.gameHolding.count.mockResolvedValue(0);
  prismaMock.rolePermission.findMany.mockResolvedValue([] as never);
});

describe("runYearTurnCron", () => {
  it("does nothing when there are no candidates", async () => {
    const summary = await runYearTurnCron(NOW);

    expect(summary).toEqual({
      stufe2: { anonymised: 0, blocked: [] },
      stufe3: { deleted: 0, blocked: [] },
    });
    expect(sendTransactionalEmailMock).not.toHaveBeenCalled();
  });

  it("applies the Ausgetreten role and runs Stufe 2 for an eligible member", async () => {
    prismaMock.member.findMany.mockResolvedValueOnce([
      {
        id: "member-1",
        meepleId: "meeple-1",
        meeple: { id: "meeple-1", displayName: "Lea" },
      },
    ] as never);

    const summary = await runYearTurnCron(NOW);

    expect(applyAusgetretenRoleMock).toHaveBeenCalledWith("meeple-1");
    expect(anonymiseMeepleStufe2Mock).toHaveBeenCalledWith("meeple-1", NOW);
    expect(summary.stufe2).toEqual({ anonymised: 1, blocked: [] });
  });

  it("blocks Stufe 2 on open holdings without calling anonymiseMeepleStufe2", async () => {
    prismaMock.member.findMany.mockResolvedValueOnce([
      {
        id: "member-1",
        meepleId: "meeple-1",
        meeple: { id: "meeple-1", displayName: "Lea" },
      },
    ] as never);
    prismaMock.gameHolding.count.mockResolvedValueOnce(1);

    const summary = await runYearTurnCron(NOW);

    expect(anonymiseMeepleStufe2Mock).not.toHaveBeenCalled();
    expect(summary.stufe2.blocked).toEqual([
      { memberId: "member-1", displayName: "Lea" },
    ]);
  });

  it("runs Stufe 3 for every eligible member", async () => {
    listMembersEligibleForStufe3Mock.mockResolvedValue([
      { id: "member-9" },
      { id: "member-10" },
    ]);

    const summary = await runYearTurnCron(NOW);

    expect(anonymiseMemberStufe3Mock).toHaveBeenCalledWith("member-9", NOW);
    expect(anonymiseMemberStufe3Mock).toHaveBeenCalledWith("member-10", NOW);
    expect(summary.stufe3.deleted).toBe(2);
  });

  it("sends a single collective mail to recipients with members:manage or games:manage", async () => {
    prismaMock.member.findMany
      .mockResolvedValueOnce([
        {
          id: "member-1",
          meepleId: "meeple-1",
          meeple: { id: "meeple-1", displayName: "Lea" },
        },
      ] as never)
      // listMembersOverdueForStufe3WithOpenHoldings' own findMany call
      .mockResolvedValueOnce([] as never)
      // listRecipientsWithAnyPermission's Member lookup
      .mockResolvedValueOnce([{ email: "vorstand@example.com" }] as never);
    prismaMock.gameHolding.count.mockResolvedValueOnce(1);
    prismaMock.rolePermission.findMany.mockResolvedValue([
      { role: { users: [{ neonAuthUserId: "admin-1" }] } },
    ] as never);

    await runYearTurnCron(NOW);

    expect(sendTransactionalEmailMock).toHaveBeenCalledTimes(1);
    expect(sendTransactionalEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: "vorstand@example.com" }),
    );
  });
});
