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
const anonymiseMeepleStufe1Mock = vi.fn();
const anonymiseMeepleStufe2Mock = vi.fn();
const anonymiseMemberStufe3Mock = vi.fn();
vi.mock("@/lib/members/anonymisation", () => ({
  anonymiseMeepleStufe1: (...args: unknown[]) =>
    anonymiseMeepleStufe1Mock(...args),
  anonymiseMeepleStufe2: (...args: unknown[]) =>
    anonymiseMeepleStufe2Mock(...args),
  anonymiseMemberStufe3: (...args: unknown[]) =>
    anonymiseMemberStufe3Mock(...args),
}));

const removeAusgetretenRoleMock = vi.fn();
vi.mock("@/lib/auth/ausgetreten-role", () => ({
  removeAusgetretenRole: (...args: unknown[]) =>
    removeAusgetretenRoleMock(...args),
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

// The role CRUD and role-assignment wrappers have their own test file
// (role-actions.test.ts) — kept separate purely to stay under the 400-line
// file-size limit (CLAUDE.md), not a fachliche Grenze.
vi.mock("@/lib/auth/roles", () => ({
  createRole: vi.fn(),
  updateRole: vi.fn(),
  deleteRole: vi.fn(),
  setRolePermissions: vi.fn(),
}));
vi.mock("@/lib/auth/user-roles", () => ({
  assignMeepleRole: vi.fn(),
  removeMeepleRole: vi.fn(),
  listMeepleRoleAssignments: vi.fn(),
}));

const {
  anonymiseMeeple,
  deleteMemberPermanently,
  getOpenHoldingsSummary,
  recordResignation,
  renameMeeple,
  revealMemberIban,
  revokeResignation,
  sendSelbstauskunft,
  setMemberNumber,
} = await import("./actions");

class ForbiddenError extends Error {}

beforeEach(() => {
  requirePermissionMock.mockResolvedValue({ id: "admin-user" });
  anonymiseMeepleStufe1Mock.mockReset();
  anonymiseMeepleStufe1Mock.mockResolvedValue({ success: true });
  anonymiseMeepleStufe2Mock.mockReset();
  anonymiseMeepleStufe2Mock.mockResolvedValue({ success: true });
  anonymiseMemberStufe3Mock.mockReset();
  anonymiseMemberStufe3Mock.mockResolvedValue({ success: true });
  removeAusgetretenRoleMock.mockReset();
  requireBankReaderMock.mockReset().mockResolvedValue({ id: "meeple-admin" });
  revealMeepleIbanMock.mockReset();
  sendSelbstauskunftMailMock.mockReset().mockResolvedValue({ success: true });
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
    await expect(deleteMemberPermanently("member-1")).rejects.toThrow(
      ForbiddenError,
    );
    await expect(getOpenHoldingsSummary("meeple-1")).rejects.toThrow(
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
    expect(prismaMock.meeple.update).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(anonymiseMeepleStufe1Mock).not.toHaveBeenCalled();
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
  it("clears both date fields on the linked Member and any Ausgetreten-Rolle", async () => {
    await revokeResignation("meeple-1");

    expect(prismaMock.member.update).toHaveBeenCalledWith({
      where: { meepleId: "meeple-1" },
      data: { resignedAt: null, membershipEndsAt: null },
    });
    expect(removeAusgetretenRoleMock).toHaveBeenCalledWith("meeple-1");
  });
});

describe("anonymiseMeeple", () => {
  it("runs Stufe 1 then Stufe 2 and revalidates on success", async () => {
    expect(await anonymiseMeeple("meeple-1")).toEqual({ success: true });
    expect(anonymiseMeepleStufe1Mock).toHaveBeenCalledWith("meeple-1");
    expect(anonymiseMeepleStufe2Mock).toHaveBeenCalledWith("meeple-1");
  });

  it("passes a Stufe-1 violation straight back without attempting Stufe 2", async () => {
    anonymiseMeepleStufe1Mock.mockResolvedValue({
      error: "Dieses Mitglied ist bereits vollständig anonymisiert (Stufe 2).",
    });

    expect(await anonymiseMeeple("meeple-1")).toEqual({
      error: "Dieses Mitglied ist bereits vollständig anonymisiert (Stufe 2).",
    });
    expect(anonymiseMeepleStufe2Mock).not.toHaveBeenCalled();
  });

  it("passes a Stufe-2 violation straight back without revalidating", async () => {
    anonymiseMeepleStufe2Mock.mockResolvedValue({
      error: "Nur ausgetretene Mitglieder können anonymisiert werden.",
    });

    expect(await anonymiseMeeple("meeple-1")).toEqual({
      error: "Nur ausgetretene Mitglieder können anonymisiert werden.",
    });
  });
});

describe("deleteMemberPermanently", () => {
  it("delegates to Stufe 3 and revalidates on success", async () => {
    expect(await deleteMemberPermanently("member-1")).toEqual({
      success: true,
    });
    expect(anonymiseMemberStufe3Mock).toHaveBeenCalledWith("member-1");
  });

  it("passes a rule violation straight back", async () => {
    anonymiseMemberStufe3Mock.mockResolvedValue({
      error: "Seit dem Austritt sind noch keine 12 Monate vergangen.",
    });

    expect(await deleteMemberPermanently("member-1")).toEqual({
      error: "Seit dem Austritt sind noch keine 12 Monate vergangen.",
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
