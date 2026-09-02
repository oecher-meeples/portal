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

const { updateMeepleDaten } = await import("./meeple-daten-actions");

beforeEach(() => {
  requirePermissionMock.mockReset().mockResolvedValue({ id: "admin-1" });
  requireMemberMock.mockReset();
  prismaMock.meeple.update.mockResolvedValue({} as never);
  prismaMock.member.findUnique.mockResolvedValue({
    slug: "mitglied-1",
  } as never);
});

describe("updateMeepleDaten (#382)", () => {
  it("allows the meeple themselves without members:manage", async () => {
    requireMemberMock.mockResolvedValue({ meeple: { id: "meeple-1" } });

    const result = await updateMeepleDaten("meeple-1", {
      bggUsername: "erika",
    });

    expect(result).toEqual({ success: true });
    expect(requirePermissionMock).not.toHaveBeenCalled();
    expect(prismaMock.meeple.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "meeple-1" },
        data: expect.objectContaining({ bggUsername: "erika" }),
      }),
    );
  });

  it("allows members:manage editing someone else's Meeple-Daten", async () => {
    requireMemberMock.mockResolvedValue({ meeple: { id: "meeple-admin" } });

    const result = await updateMeepleDaten("meeple-other", {
      bggUsername: "erika",
    });

    expect(result).toEqual({ success: true });
    expect(requirePermissionMock).toHaveBeenCalledWith("members:manage");
  });

  it("refuses a stranger without members:manage", async () => {
    requireMemberMock.mockResolvedValue({ meeple: { id: "meeple-stranger" } });
    requirePermissionMock.mockRejectedValue(new Error("/403"));

    await expect(
      updateMeepleDaten("meeple-other", { bggUsername: "x" }),
    ).rejects.toThrow();
    expect(prismaMock.meeple.update).not.toHaveBeenCalled();
  });

  it("strips a leading @ from handle fields", async () => {
    requireMemberMock.mockResolvedValue({ meeple: { id: "meeple-1" } });

    await updateMeepleDaten("meeple-1", { telegramHandle: "@erika" });

    expect(prismaMock.meeple.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ telegramHandle: "erika" }),
      }),
    );
  });
});
