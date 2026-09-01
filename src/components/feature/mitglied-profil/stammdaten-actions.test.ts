import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const requirePermissionMock = vi.fn();
vi.mock("@/lib/auth/permissions", () => ({
  requirePermission: (...args: unknown[]) => requirePermissionMock(...args),
}));

const assertMaySubmitChangeForMock = vi.fn();
vi.mock("@/lib/members/guardians", () => ({
  assertMaySubmitChangeFor: (...args: unknown[]) =>
    assertMaySubmitChangeForMock(...args),
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
  tshirtSizeId: null,
  joinedAt: null,
};

beforeEach(() => {
  requirePermissionMock.mockReset().mockResolvedValue({ id: "admin-1" });
  assertMaySubmitChangeForMock.mockReset().mockResolvedValue(undefined);
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
  // Wer einen Antrag stellen darf, prüft `assertMaySubmitChangeFor` selbst
  // (siehe `lib/members/guardians.test.ts`) — hier nur der Wrapper: leitet
  // an `requestStammdatenChange` weiter bzw. propagiert dessen Ablehnung.
  it("submits the diff once authorised", async () => {
    const diff = { firstName: { old: "Alt", new: "Neu" } };
    const result = await requestMemberStammdatenChange("member-1", diff);

    expect(assertMaySubmitChangeForMock).toHaveBeenCalledWith("member-1");
    expect(result).toEqual({ success: true });
    expect(requestStammdatenChangeMock).toHaveBeenCalledWith("member-1", diff);
  });

  it("propagates the authorisation error without submitting", async () => {
    assertMaySubmitChangeForMock.mockRejectedValue(
      new Error(
        "Du bist nicht berechtigt, einen Änderungsantrag für dieses Mitglied zu stellen.",
      ),
    );

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
