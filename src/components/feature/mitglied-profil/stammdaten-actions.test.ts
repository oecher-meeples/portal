import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const requirePermissionMock = vi.fn();
vi.mock("@/lib/auth/permissions", () => ({
  requirePermission: (...args: unknown[]) => requirePermissionMock(...args),
}));

const requireMemberMock = vi.fn();
vi.mock("@/lib/auth/session", () => ({
  requireMember: () => requireMemberMock(),
}));

const isGuardianOfMock = vi.fn();
vi.mock("@/lib/members/guardians", () => ({
  isGuardianOf: (...args: unknown[]) => isGuardianOfMock(...args),
}));

const requestStammdatenChangeMock = vi.fn();
vi.mock("@/lib/members/pending-changes", () => ({
  requestStammdatenChange: (...args: unknown[]) =>
    requestStammdatenChangeMock(...args),
}));

const { updateMemberStammdaten, requestMemberStammdatenChange } =
  await import("./stammdaten-actions");

const INPUT = {
  firstName: "Erika",
  lastName: "Muster",
  birthDate: "2015-05-01",
  birthPlace: null,
  street: null,
  postalCode: null,
  city: null,
  phone: null,
};

beforeEach(() => {
  requirePermissionMock.mockReset().mockResolvedValue({ id: "admin-1" });
  requireMemberMock.mockReset();
  isGuardianOfMock.mockReset().mockResolvedValue(false);
  requestStammdatenChangeMock.mockReset().mockResolvedValue({
    success: true,
  });
  prismaMock.member.update.mockResolvedValue({} as never);
  prismaMock.member.findUniqueOrThrow.mockResolvedValue({
    slug: "mitglied-1",
  } as never);
  prismaMock.member.findUnique.mockResolvedValue(null);
});

describe("updateMemberStammdaten (#380)", () => {
  it("requires members:manage", async () => {
    requirePermissionMock.mockRejectedValue(new Error("/403"));

    await expect(updateMemberStammdaten("member-1", INPUT)).rejects.toThrow();
    expect(prismaMock.member.update).not.toHaveBeenCalled();
  });

  it("applies the change directly, no pending change", async () => {
    const result = await updateMemberStammdaten("member-1", INPUT);

    expect(result).toEqual({ success: true });
    expect(prismaMock.member.update).toHaveBeenCalledWith({
      where: { id: "member-1" },
      data: expect.objectContaining({
        firstName: "Erika",
        lastName: "Muster",
        birthDate: new Date("2015-05-01"),
      }),
    });
  });
});

describe("requestMemberStammdatenChange (#372, #380)", () => {
  it("allows the member themselves", async () => {
    requireMemberMock.mockResolvedValue({
      meeple: { id: "meeple-1" },
    });
    prismaMock.member.findUniqueOrThrow.mockResolvedValueOnce({
      meepleId: "meeple-1",
    } as never);

    const diff = { firstName: { old: "Alt", new: "Neu" } };
    const result = await requestMemberStammdatenChange("member-1", diff);

    expect(result).toEqual({ success: true });
    expect(requestStammdatenChangeMock).toHaveBeenCalledWith("member-1", diff);
  });

  it("allows a linked guardian", async () => {
    requireMemberMock.mockResolvedValue({
      meeple: { id: "meeple-guardian" },
    });
    prismaMock.member.findUniqueOrThrow.mockResolvedValueOnce({
      meepleId: "meeple-child",
    } as never);
    prismaMock.member.findUnique.mockResolvedValueOnce({
      id: "guardian-member-1",
    } as never);
    isGuardianOfMock.mockResolvedValue(true);

    const diff = { firstName: { old: "Alt", new: "Neu" } };
    const result = await requestMemberStammdatenChange("child-1", diff);

    expect(result).toEqual({ success: true });
    expect(isGuardianOfMock).toHaveBeenCalledWith(
      "guardian-member-1",
      "child-1",
    );
  });

  it("refuses a stranger with no relationship to the target", async () => {
    requireMemberMock.mockResolvedValue({
      meeple: { id: "meeple-stranger" },
    });
    prismaMock.member.findUniqueOrThrow.mockResolvedValueOnce({
      meepleId: "meeple-child",
    } as never);
    prismaMock.member.findUnique.mockResolvedValueOnce(null);

    await expect(
      requestMemberStammdatenChange("child-1", {
        firstName: { old: "Alt", new: "Neu" },
      }),
    ).rejects.toThrow(
      "Du bist nicht berechtigt, einen Änderungsantrag für dieses Mitglied zu stellen.",
    );
    expect(requestStammdatenChangeMock).not.toHaveBeenCalled();
  });
});
