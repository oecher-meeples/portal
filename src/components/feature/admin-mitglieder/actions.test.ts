import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));

const requirePermissionMock = vi.fn();
vi.mock("@/lib/auth/permissions", () => ({
  requirePermission: (...args: unknown[]) => requirePermissionMock(...args),
}));

// The anonymisation rules themselves live in the lib layer and are tested in
// src/lib/members/anonymisation.test.ts — here only the action wrapper matters.
const anonymiseMeepleRecordMock = vi.fn();
vi.mock("@/lib/members/anonymisation", () => ({
  anonymiseMeepleRecord: (...args: unknown[]) =>
    anonymiseMeepleRecordMock(...args),
}));

// Ditto for the bank-reveal and Selbstauskunft-mail rules — those are tested in
// src/lib/members/bank-access-log.test.ts and selbstauskunft-mail.test.ts.
const requireBankReaderMock = vi.fn();
const revealMeepleIbanMock = vi.fn();
vi.mock("@/lib/members/bank-access-log", () => ({
  requireBankReader: (...args: unknown[]) => requireBankReaderMock(...args),
  revealMeepleIban: (...args: unknown[]) => revealMeepleIbanMock(...args),
}));

const sendSelbstauskunftMailMock = vi.fn();
vi.mock("@/lib/members/selbstauskunft-mail", () => ({
  sendSelbstauskunftMail: (...args: unknown[]) =>
    sendSelbstauskunftMailMock(...args),
}));

// The role CRUD rules themselves live in the lib layer and are tested in
// src/lib/auth/roles.test.ts — here only the action wrappers matter.
const createRoleRecordMock = vi.fn();
const updateRoleRecordMock = vi.fn();
const deleteRoleRecordMock = vi.fn();
const setRolePermissionsRecordMock = vi.fn();
vi.mock("@/lib/auth/roles", () => ({
  createRole: (...args: unknown[]) => createRoleRecordMock(...args),
  updateRole: (...args: unknown[]) => updateRoleRecordMock(...args),
  deleteRole: (...args: unknown[]) => deleteRoleRecordMock(...args),
  setRolePermissions: (...args: unknown[]) =>
    setRolePermissionsRecordMock(...args),
}));

// The assignment rules themselves live in the lib layer and are tested in
// src/lib/auth/user-roles.test.ts — here only the action wrappers matter.
const assignMeepleRoleRecordMock = vi.fn();
const removeMeepleRoleRecordMock = vi.fn();
const listMeepleRoleAssignmentsMock = vi.fn();
vi.mock("@/lib/auth/user-roles", () => ({
  assignMeepleRole: (...args: unknown[]) => assignMeepleRoleRecordMock(...args),
  removeMeepleRole: (...args: unknown[]) => removeMeepleRoleRecordMock(...args),
  listMeepleRoleAssignments: (...args: unknown[]) =>
    listMeepleRoleAssignmentsMock(...args),
}));

const {
  anonymiseMeeple,
  assignMeepleRole,
  createRole,
  deleteRole,
  getOpenHoldingsSummary,
  recordResignation,
  removeMeepleRole,
  renameMeeple,
  revealMemberIban,
  revokeResignation,
  sendSelbstauskunft,
  setMemberNumber,
  setRolePermissions,
  updateRole,
} = await import("./actions");

class ForbiddenError extends Error {}

beforeEach(() => {
  requirePermissionMock.mockResolvedValue({ id: "admin-user" });
  anonymiseMeepleRecordMock.mockReset();
  anonymiseMeepleRecordMock.mockResolvedValue({ success: true });
  requireBankReaderMock.mockReset().mockResolvedValue({ id: "meeple-admin" });
  revealMeepleIbanMock.mockReset();
  sendSelbstauskunftMailMock.mockReset().mockResolvedValue({ success: true });
  createRoleRecordMock.mockReset().mockResolvedValue({ success: true });
  updateRoleRecordMock.mockReset().mockResolvedValue({ success: true });
  deleteRoleRecordMock.mockReset().mockResolvedValue({ success: true });
  setRolePermissionsRecordMock.mockReset().mockResolvedValue({
    success: true,
  });
  assignMeepleRoleRecordMock.mockReset().mockResolvedValue({ success: true });
  removeMeepleRoleRecordMock.mockReset().mockResolvedValue({ success: true });
  listMeepleRoleAssignmentsMock.mockReset().mockResolvedValue([]);
  prismaMock.$transaction.mockImplementation((arg) =>
    typeof arg === "function" ? arg(prismaMock) : Promise.all(arg as never),
  );
});

describe("without the members:manage permission", () => {
  it("changes nothing in the database", async () => {
    requirePermissionMock.mockRejectedValue(new ForbiddenError("/403"));

    await expect(recordResignation("meeple-1", new Date())).rejects.toThrow(
      ForbiddenError,
    );
    await expect(revokeResignation("meeple-1")).rejects.toThrow(ForbiddenError);
    await expect(anonymiseMeeple("meeple-1")).rejects.toThrow(ForbiddenError);
    await expect(getOpenHoldingsSummary("meeple-1")).rejects.toThrow(
      ForbiddenError,
    );
    await expect(assignMeepleRole("meeple-1", "role-1")).rejects.toThrow(
      ForbiddenError,
    );
    await expect(removeMeepleRole("user-role-1")).rejects.toThrow(
      ForbiddenError,
    );
    await expect(setMemberNumber("meeple-1", 10)).rejects.toThrow(
      ForbiddenError,
    );
    await expect(renameMeeple("meeple-1", "Neuer Name")).rejects.toThrow(
      ForbiddenError,
    );
    await expect(sendSelbstauskunft("meeple-1")).rejects.toThrow(
      ForbiddenError,
    );
    await expect(createRole("Vorstand", null)).rejects.toThrow(ForbiddenError);
    await expect(updateRole("role-1", "Vorstand", null)).rejects.toThrow(
      ForbiddenError,
    );
    await expect(deleteRole("role-1")).rejects.toThrow(ForbiddenError);
    await expect(setRolePermissions("role-1", ["perm-1"])).rejects.toThrow(
      ForbiddenError,
    );
    expect(prismaMock.meeple.update).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(anonymiseMeepleRecordMock).not.toHaveBeenCalled();
    expect(createRoleRecordMock).not.toHaveBeenCalled();
    expect(updateRoleRecordMock).not.toHaveBeenCalled();
    expect(deleteRoleRecordMock).not.toHaveBeenCalled();
    expect(setRolePermissionsRecordMock).not.toHaveBeenCalled();
  });
});

describe("recordResignation", () => {
  it("sets both resignedAt and membershipEndsAt on the linked Member", async () => {
    vi.setSystemTime(new Date("2026-07-29T12:00:00Z"));

    await recordResignation("meeple-1", new Date("2027-01-01T00:00:00Z"));

    expect(prismaMock.member.update).toHaveBeenCalledWith({
      where: { meepleId: "meeple-1" },
      data: {
        resignedAt: new Date("2026-07-29T12:00:00Z"),
        membershipEndsAt: new Date("2027-01-01T00:00:00Z"),
      },
    });

    vi.useRealTimers();
  });

  it("closes the meeple's open Spielergesuche in the same transaction", async () => {
    await recordResignation("meeple-1", new Date("2027-01-01T00:00:00Z"));

    expect(prismaMock.lfgPost.updateMany).toHaveBeenCalledWith({
      where: { createdByMeepleId: "meeple-1", closedAt: null },
      data: { closedAt: expect.any(Date) },
    });
  });
});

describe("revokeResignation", () => {
  it("clears both date fields on the linked Member", async () => {
    await revokeResignation("meeple-1");

    expect(prismaMock.member.update).toHaveBeenCalledWith({
      where: { meepleId: "meeple-1" },
      data: { resignedAt: null, membershipEndsAt: null },
    });
  });
});

describe("anonymiseMeeple", () => {
  it("delegates to the shared anonymisation rules and revalidates on success", async () => {
    anonymiseMeepleRecordMock.mockResolvedValue({ success: true });

    expect(await anonymiseMeeple("meeple-1")).toEqual({ success: true });
    expect(anonymiseMeepleRecordMock).toHaveBeenCalledWith("meeple-1");
  });

  it("passes a rule violation straight back without revalidating", async () => {
    anonymiseMeepleRecordMock.mockResolvedValue({
      error: "Nur ausgetretene Mitglieder können anonymisiert werden.",
    });

    expect(await anonymiseMeeple("meeple-1")).toEqual({
      error: "Nur ausgetretene Mitglieder können anonymisiert werden.",
    });
  });
});

describe("assignMeepleRole", () => {
  it("delegates to the shared assignment rules and revalidates on success", async () => {
    expect(await assignMeepleRole("meeple-1", "role-admin")).toEqual({
      success: true,
    });
    expect(assignMeepleRoleRecordMock).toHaveBeenCalledWith(
      "meeple-1",
      "role-admin",
      undefined,
    );
  });

  it("passes a rule violation straight back without revalidating", async () => {
    assignMeepleRoleRecordMock.mockResolvedValue({
      error: "Dieses Mitglied hat kein Login-Konto.",
    });

    expect(await assignMeepleRole("meeple-1", "role-admin")).toEqual({
      error: "Dieses Mitglied hat kein Login-Konto.",
    });
  });

  it("requires admin:access instead of members:manage when a time window is given", async () => {
    await assignMeepleRole("meeple-1", "role-vorstand", {
      startsAt: new Date("2026-01-01"),
      endsAt: new Date("2027-01-01"),
    });

    expect(requirePermissionMock).toHaveBeenCalledWith("admin:access");
  });

  it("requires members:manage for a plain assignment (no window)", async () => {
    await assignMeepleRole("meeple-1", "role-vorstand");

    expect(requirePermissionMock).toHaveBeenCalledWith("members:manage");
  });
});

describe("removeMeepleRole", () => {
  it("delegates to the shared rules and revalidates on success", async () => {
    expect(await removeMeepleRole("user-role-1")).toEqual({ success: true });
    expect(removeMeepleRoleRecordMock).toHaveBeenCalledWith("user-role-1");
  });

  it("passes a rule violation straight back", async () => {
    removeMeepleRoleRecordMock.mockResolvedValue({
      error: "Rollenzuweisung nicht gefunden.",
    });

    expect(await removeMeepleRole("user-role-1")).toEqual({
      error: "Rollenzuweisung nicht gefunden.",
    });
  });
});

describe("setMemberNumber", () => {
  it("assigns the number and revalidates on success", async () => {
    prismaMock.meeple.findUnique
      .mockResolvedValueOnce({ id: "meeple-1", memberNumber: 5 } as never)
      .mockResolvedValueOnce(null);

    expect(await setMemberNumber("meeple-1", 10)).toEqual({ success: true });
    expect(prismaMock.meeple.update).toHaveBeenCalledWith({
      where: { id: "meeple-1" },
      data: { memberNumber: 10 },
    });
  });

  it("passes a rule violation straight back", async () => {
    prismaMock.meeple.findUnique.mockResolvedValue(null);

    expect(await setMemberNumber("meeple-1", 10)).toEqual({
      error: "Mitglied nicht gefunden.",
    });
  });
});

describe("renameMeeple", () => {
  it("trims and saves the new display name", async () => {
    expect(await renameMeeple("meeple-1", "  Neuer Name  ")).toEqual({
      success: true,
    });

    expect(prismaMock.meeple.update).toHaveBeenCalledWith({
      where: { id: "meeple-1" },
      data: { displayName: "Neuer Name" },
    });
  });

  it("refuses a blank name", async () => {
    expect(await renameMeeple("meeple-1", "   ")).toEqual({
      error: "Bitte einen Anzeigenamen angeben.",
    });
    expect(prismaMock.meeple.update).not.toHaveBeenCalled();
  });
});

describe("revealMemberIban", () => {
  it("checks bank:read separately from members:manage and delegates the reveal", async () => {
    revealMeepleIbanMock.mockResolvedValue({ success: true, iban: "DE00" });

    expect(await revealMemberIban("meeple-1")).toEqual({
      success: true,
      iban: "DE00",
    });
    expect(requireBankReaderMock).toHaveBeenCalled();
    expect(revealMeepleIbanMock).toHaveBeenCalledWith(
      "meeple-1",
      "meeple-admin",
    );
  });

  it("rejects without the bank:read permission, independent of members:manage", async () => {
    requireBankReaderMock.mockRejectedValue(new ForbiddenError("/403"));

    await expect(revealMemberIban("meeple-1")).rejects.toThrow(ForbiddenError);
    expect(revealMeepleIbanMock).not.toHaveBeenCalled();
  });
});

describe("sendSelbstauskunft", () => {
  it("delegates to the shared mail rules", async () => {
    sendSelbstauskunftMailMock.mockResolvedValue({ success: true });

    expect(await sendSelbstauskunft("meeple-1")).toEqual({ success: true });
    expect(sendSelbstauskunftMailMock).toHaveBeenCalledWith("meeple-1");
  });

  it("passes a rule violation straight back", async () => {
    sendSelbstauskunftMailMock.mockResolvedValue({
      error: "Für dieses Mitglied ist keine E-Mail-Adresse hinterlegt.",
    });

    expect(await sendSelbstauskunft("meeple-1")).toEqual({
      error: "Für dieses Mitglied ist keine E-Mail-Adresse hinterlegt.",
    });
  });
});

describe("createRole", () => {
  it("delegates to the shared role rules and revalidates on success", async () => {
    expect(await createRole("Vorstand", "Leitung")).toEqual({
      success: true,
    });
    expect(createRoleRecordMock).toHaveBeenCalledWith("Vorstand", "Leitung");
  });

  it("passes a rule violation straight back", async () => {
    createRoleRecordMock.mockResolvedValue({
      error: "Eine Rolle mit dem Namen „Vorstand“ existiert bereits.",
    });

    expect(await createRole("Vorstand", null)).toEqual({
      error: "Eine Rolle mit dem Namen „Vorstand“ existiert bereits.",
    });
  });
});

describe("updateRole", () => {
  it("delegates to the shared role rules and revalidates on success", async () => {
    expect(await updateRole("role-1", "Vorstand", "Leitung")).toEqual({
      success: true,
    });
    expect(updateRoleRecordMock).toHaveBeenCalledWith(
      "role-1",
      "Vorstand",
      "Leitung",
    );
  });

  it("passes a rule violation straight back", async () => {
    updateRoleRecordMock.mockResolvedValue({
      error: "Eine Rolle mit dem Namen „Vorstand“ existiert bereits.",
    });

    expect(await updateRole("role-1", "Vorstand", null)).toEqual({
      error: "Eine Rolle mit dem Namen „Vorstand“ existiert bereits.",
    });
  });
});

describe("deleteRole", () => {
  it("delegates to the shared role rules and revalidates on success", async () => {
    expect(await deleteRole("role-1")).toEqual({ success: true });
    expect(deleteRoleRecordMock).toHaveBeenCalledWith("role-1");
  });
});

describe("setRolePermissions", () => {
  it("delegates to the shared role rules and revalidates on success", async () => {
    expect(await setRolePermissions("role-1", ["perm-a"])).toEqual({
      success: true,
    });
    expect(setRolePermissionsRecordMock).toHaveBeenCalledWith("role-1", [
      "perm-a",
    ]);
  });

  it("passes a rule violation straight back (e.g. the system-admin role)", async () => {
    setRolePermissionsRecordMock.mockResolvedValue({
      error:
        "Diese Rolle gewährt Systemzugriff und behält deshalb immer alle Rechte — sie können nicht einzeln entzogen werden.",
    });

    expect(await setRolePermissions("role-admin", [])).toEqual({
      error:
        "Diese Rolle gewährt Systemzugriff und behält deshalb immer alle Rechte — sie können nicht einzeln entzogen werden.",
    });
  });
});
