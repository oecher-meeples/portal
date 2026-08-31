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
  const actual =
    await vi.importActual<typeof import("@/lib/members/invites")>(
      "@/lib/members/invites",
    );
  return {
    ...actual,
    findOpenInviteByEmail: (...args: unknown[]) =>
      findOpenInviteByEmailMock(...args),
  };
});

const { createInvite } = await import("./invite-actions");

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
});
