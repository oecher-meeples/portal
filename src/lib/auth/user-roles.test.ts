import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { assignMeepleRole, removeMeepleRole, listMeepleRoleAssignments } =
  await import("./user-roles");

beforeEach(() => {
  vi.useRealTimers();
});

describe("assignMeepleRole", () => {
  it("adds a role without touching any other assignment (Mehrfachrollen, #335)", async () => {
    prismaMock.meeple.findUniqueOrThrow.mockResolvedValue({
      displayName: "Erika Musterfrau",
      neonAuthUserId: "user-1",
    } as never);
    prismaMock.role.findUniqueOrThrow.mockResolvedValue({
      id: "role-vorstand",
    } as never);
    vi.setSystemTime(new Date("2026-08-30T10:00:00Z"));

    expect(await assignMeepleRole("meeple-1", "role-vorstand")).toEqual({
      success: true,
    });

    expect(prismaMock.userRole.deleteMany).not.toHaveBeenCalled();
    expect(prismaMock.userRole.create).toHaveBeenCalledWith({
      data: {
        neonAuthUserId: "user-1",
        roleId: "role-vorstand",
        startsAt: new Date("2026-08-30T10:00:00Z"),
        endsAt: null,
      },
    });
  });

  it("stores an explicit time window (Amtszeit, #264) unchanged", async () => {
    prismaMock.meeple.findUniqueOrThrow.mockResolvedValue({
      displayName: "Erika Musterfrau",
      neonAuthUserId: "user-1",
    } as never);
    prismaMock.role.findUniqueOrThrow.mockResolvedValue({
      id: "role-vorstand",
    } as never);

    await assignMeepleRole("meeple-1", "role-vorstand", {
      startsAt: new Date("2026-01-01T00:00:00Z"),
      endsAt: new Date("2027-01-01T00:00:00Z"),
    });

    expect(prismaMock.userRole.create).toHaveBeenCalledWith({
      data: {
        neonAuthUserId: "user-1",
        roleId: "role-vorstand",
        startsAt: new Date("2026-01-01T00:00:00Z"),
        endsAt: new Date("2027-01-01T00:00:00Z"),
      },
    });
  });

  it("refuses to change the protected fallback admin's roles", async () => {
    prismaMock.meeple.findUniqueOrThrow.mockResolvedValue({
      displayName: "Admin",
      neonAuthUserId: "user-1",
    } as never);
    prismaMock.role.findUniqueOrThrow.mockResolvedValue({
      id: "role-vorstand",
    } as never);

    expect(await assignMeepleRole("meeple-1", "role-vorstand")).toEqual({
      error:
        "Die Rollen des Benutzers „Admin“ sind geschützt und können nicht geändert werden.",
    });
    expect(prismaMock.userRole.create).not.toHaveBeenCalled();
  });

  it("refuses to assign a role to a Meeple without a login account", async () => {
    prismaMock.meeple.findUniqueOrThrow.mockResolvedValue({
      displayName: "Erika Musterfrau",
      neonAuthUserId: null,
    } as never);
    prismaMock.role.findUniqueOrThrow.mockResolvedValue({
      id: "role-vorstand",
    } as never);

    expect(await assignMeepleRole("meeple-1", "role-vorstand")).toEqual({
      error: "Dieses Mitglied hat kein Login-Konto.",
    });
    expect(prismaMock.userRole.create).not.toHaveBeenCalled();
  });
});

const NON_ADMIN_ROLE = { permissions: [{ permission: { key: "posts:write" } }] };
const ADMIN_ACCESS_ROLE = {
  permissions: [{ permission: { key: "admin:access" } }],
};

describe("removeMeepleRole", () => {
  it("ends an open-ended assignment now instead of deleting it", async () => {
    prismaMock.userRole.findUnique.mockResolvedValue({
      id: "user-role-1",
      endsAt: null,
      neonAuthUserId: "user-1",
      role: NON_ADMIN_ROLE,
    } as never);
    prismaMock.userRole.findMany.mockResolvedValue([]);
    vi.setSystemTime(new Date("2026-08-30T10:00:00Z"));

    expect(await removeMeepleRole("user-role-1", "actor-1")).toEqual({
      success: true,
    });

    expect(prismaMock.userRole.delete).not.toHaveBeenCalled();
    expect(prismaMock.userRole.update).toHaveBeenCalledWith({
      where: { id: "user-role-1" },
      data: { endsAt: new Date("2026-08-30T10:00:00Z") },
    });
  });

  it("does nothing to an assignment already expired in the past", async () => {
    prismaMock.userRole.findUnique.mockResolvedValue({
      id: "user-role-1",
      endsAt: new Date("2020-01-01T00:00:00Z"),
      neonAuthUserId: "user-1",
      role: NON_ADMIN_ROLE,
    } as never);

    expect(await removeMeepleRole("user-role-1", "actor-1")).toEqual({
      success: true,
    });
    expect(prismaMock.userRole.update).not.toHaveBeenCalled();
  });

  it("reports a missing assignment", async () => {
    prismaMock.userRole.findUnique.mockResolvedValue(null);

    expect(await removeMeepleRole("user-role-1", "actor-1")).toEqual({
      error: "Rollenzuweisung nicht gefunden.",
    });
  });

  describe("self-lockout guard (#354)", () => {
    it("blocks removing your own last active admin:access assignment", async () => {
      prismaMock.userRole.findUnique.mockResolvedValue({
        id: "user-role-1",
        endsAt: null,
        neonAuthUserId: "actor-1",
        role: ADMIN_ACCESS_ROLE,
      } as never);
      prismaMock.userRole.findMany.mockResolvedValue([]);

      const result = await removeMeepleRole("user-role-1", "actor-1");

      expect(result).toEqual({
        error:
          "Du kannst dir deine letzte aktive admin:access-Rollenzuweisung nicht selbst entziehen.",
      });
      expect(prismaMock.userRole.update).not.toHaveBeenCalled();
    });

    it("allows removing your own admin:access assignment when another active one remains", async () => {
      prismaMock.userRole.findUnique.mockResolvedValue({
        id: "user-role-1",
        endsAt: null,
        neonAuthUserId: "actor-1",
        role: ADMIN_ACCESS_ROLE,
      } as never);
      prismaMock.userRole.findMany.mockResolvedValue([
        { endsAt: null, role: ADMIN_ACCESS_ROLE },
      ] as never);

      const result = await removeMeepleRole("user-role-1", "actor-1");

      expect(result).toEqual({ success: true });
      expect(prismaMock.userRole.update).toHaveBeenCalled();
    });

    it("allows an admin to remove another admin's admin:access assignment", async () => {
      prismaMock.userRole.findUnique.mockResolvedValue({
        id: "user-role-1",
        endsAt: null,
        neonAuthUserId: "other-user",
        role: ADMIN_ACCESS_ROLE,
      } as never);
      prismaMock.userRole.findMany.mockResolvedValue([]);

      const result = await removeMeepleRole("user-role-1", "actor-1");

      expect(result).toEqual({ success: true });
      expect(prismaMock.userRole.update).toHaveBeenCalled();
    });
  });
});

describe("listMeepleRoleAssignments", () => {
  it("maps every assignment, active and expired, to a plain view", async () => {
    prismaMock.userRole.findMany.mockResolvedValue([
      {
        id: "user-role-1",
        roleId: "role-vorstand",
        role: { name: "Vorstand" },
        startsAt: new Date("2026-01-01T00:00:00Z"),
        endsAt: null,
      },
      {
        id: "user-role-2",
        roleId: "role-kassenwart",
        role: { name: "Kassenwart" },
        startsAt: new Date("2020-01-01T00:00:00Z"),
        endsAt: new Date("2021-01-01T00:00:00Z"),
      },
    ] as never);

    expect(await listMeepleRoleAssignments("user-1")).toEqual([
      {
        id: "user-role-1",
        roleId: "role-vorstand",
        roleName: "Vorstand",
        startsAt: "2026-01-01T00:00:00.000Z",
        endsAt: null,
      },
      {
        id: "user-role-2",
        roleId: "role-kassenwart",
        roleName: "Kassenwart",
        startsAt: "2020-01-01T00:00:00.000Z",
        endsAt: "2021-01-01T00:00:00.000Z",
      },
    ]);
  });
});
