import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const requirePermissionMock = vi.fn();
vi.mock("@/lib/auth/permissions", () => ({
  requirePermission: (...args: unknown[]) => requirePermissionMock(...args),
}));

const getDefaultInviteDaysMock = vi.fn();
vi.mock("@/lib/members/invite-settings", () => ({
  getDefaultInviteDays: () => getDefaultInviteDaysMock(),
}));

const findOpenInviteByEmailMock = vi.fn();
vi.mock("@/lib/members/invites", async () => {
  const actual = await vi.importActual<typeof import("@/lib/members/invites")>(
    "@/lib/members/invites",
  );
  return {
    ...actual,
    findOpenInviteByEmail: (...args: unknown[]) =>
      findOpenInviteByEmailMock(...args),
  };
});

const { createInvite, bulkImportInvites } = await import("./invite-actions");

const MEMBER = {
  id: "member-1",
  email: "erika@example.com",
  meepleId: null,
};

beforeEach(() => {
  requirePermissionMock.mockResolvedValue({ id: "admin-1" });
  getDefaultInviteDaysMock.mockResolvedValue(14);
  findOpenInviteByEmailMock.mockResolvedValue(null);
  prismaMock.member.findUniqueOrThrow.mockResolvedValue(MEMBER as never);
  prismaMock.invite.create.mockResolvedValue({
    token: "abc123",
    expiresAt: new Date("2026-08-15T00:00:00Z"),
  } as never);
});

describe("createInvite (#349)", () => {
  it("always uses the central default validity, never a caller-supplied override", async () => {
    await createInvite({ memberId: "member-1" });

    expect(getDefaultInviteDaysMock).toHaveBeenCalled();
    expect(prismaMock.invite.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ expiresIn: 14 * 24 * 60 }),
      }),
    );
  });

  it("refuses a member who already has a portal login", async () => {
    prismaMock.member.findUniqueOrThrow.mockResolvedValue({
      ...MEMBER,
      meepleId: "meeple-1",
    } as never);

    await expect(createInvite({ memberId: "member-1" })).rejects.toThrow(
      "Dieses Mitglied hat bereits ein Portal-Login.",
    );
  });

  it("refuses a member without an email address (#374)", async () => {
    prismaMock.member.findUniqueOrThrow.mockResolvedValue({
      ...MEMBER,
      email: null,
    } as never);

    await expect(createInvite({ memberId: "member-1" })).rejects.toThrow(
      "Dieses Mitglied hat keine E-Mail-Adresse hinterlegt.",
    );
  });
});

describe("bulkImportInvites (#265)", () => {
  it("creates one invite per email with a matching, loginless member", async () => {
    prismaMock.member.findFirst.mockResolvedValue(MEMBER as never);

    const result = await bulkImportInvites(["erika@example.com"]);

    expect(result).toEqual({ created: 1, errors: [] });
    expect(prismaMock.invite.create).toHaveBeenCalledTimes(1);
  });

  it("reports a per-row error for an email with no matching member, without aborting the batch", async () => {
    prismaMock.member.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(MEMBER as never);

    const result = await bulkImportInvites([
      "unknown@example.com",
      "erika@example.com",
    ]);

    expect(result.created).toBe(1);
    expect(result.errors).toEqual([
      {
        email: "unknown@example.com",
        message: "Kein einladbares Mitglied mit dieser E-Mail-Adresse.",
      },
    ]);
  });

  it("only matches members without a portal login and without resignation", async () => {
    await bulkImportInvites(["erika@example.com"]);

    expect(prismaMock.member.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          email: "erika@example.com",
          meepleId: null,
          resignedAt: null,
        },
      }),
    );
  });
});
