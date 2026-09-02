import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const assignMeepleRoleMock = vi.fn();
const removeMeepleRoleMock = vi.fn();
vi.mock("@/lib/auth/user-roles", () => ({
  assignMeepleRole: (...args: unknown[]) => assignMeepleRoleMock(...args),
  removeMeepleRole: (...args: unknown[]) => removeMeepleRoleMock(...args),
}));

const { applyAusgetretenRole, removeAusgetretenRole } =
  await import("@/lib/auth/ausgetreten-role");

const MEEPLE = { id: "meeple-1", neonAuthUserId: "user-1" };
const ROLE = { id: "role-ausgetreten", name: "Ausgetreten" };

beforeEach(() => {
  assignMeepleRoleMock.mockReset();
  removeMeepleRoleMock.mockReset();
});

describe("applyAusgetretenRole", () => {
  it("does nothing when the meeple has no login", async () => {
    prismaMock.meeple.findUnique.mockResolvedValue({
      ...MEEPLE,
      neonAuthUserId: null,
    } as never);

    await applyAusgetretenRole("meeple-1");

    expect(assignMeepleRoleMock).not.toHaveBeenCalled();
  });

  it("does nothing when the role doesn't exist", async () => {
    prismaMock.meeple.findUnique.mockResolvedValue(MEEPLE as never);
    prismaMock.role.findUnique.mockResolvedValue(null);

    await applyAusgetretenRole("meeple-1");

    expect(assignMeepleRoleMock).not.toHaveBeenCalled();
  });

  it("does nothing when the role is already active", async () => {
    prismaMock.meeple.findUnique.mockResolvedValue(MEEPLE as never);
    prismaMock.role.findUnique.mockResolvedValue(ROLE as never);
    prismaMock.userRole.findFirst.mockResolvedValue({ id: "ur-1" } as never);

    await applyAusgetretenRole("meeple-1");

    expect(assignMeepleRoleMock).not.toHaveBeenCalled();
  });

  it("assigns the role when missing", async () => {
    prismaMock.meeple.findUnique.mockResolvedValue(MEEPLE as never);
    prismaMock.role.findUnique.mockResolvedValue(ROLE as never);
    prismaMock.userRole.findFirst.mockResolvedValue(null);

    await applyAusgetretenRole("meeple-1");

    expect(assignMeepleRoleMock).toHaveBeenCalledWith(
      "meeple-1",
      "role-ausgetreten",
    );
  });
});

describe("removeAusgetretenRole", () => {
  it("does nothing when there is no active assignment", async () => {
    prismaMock.meeple.findUnique.mockResolvedValue(MEEPLE as never);
    prismaMock.role.findUnique.mockResolvedValue(ROLE as never);
    prismaMock.userRole.findFirst.mockResolvedValue(null);

    await removeAusgetretenRole("meeple-1");

    expect(removeMeepleRoleMock).not.toHaveBeenCalled();
  });

  it("ends the active assignment", async () => {
    prismaMock.meeple.findUnique.mockResolvedValue(MEEPLE as never);
    prismaMock.role.findUnique.mockResolvedValue(ROLE as never);
    prismaMock.userRole.findFirst.mockResolvedValue({ id: "ur-1" } as never);

    await removeAusgetretenRole("meeple-1");

    expect(removeMeepleRoleMock).toHaveBeenCalledWith("ur-1", "user-1");
  });
});
