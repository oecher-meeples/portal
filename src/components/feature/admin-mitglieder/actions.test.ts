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

const {
  anonymiseMeeple,
  getOpenHoldingsSummary,
  recordResignation,
  revokeResignation,
  setMeepleRole,
} = await import("./actions");

class ForbiddenError extends Error {}

beforeEach(() => {
  requirePermissionMock.mockResolvedValue({ id: "admin-user" });
  anonymiseMeepleRecordMock.mockReset();
  anonymiseMeepleRecordMock.mockResolvedValue({ success: true });
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
    await expect(setMeepleRole("meeple-1", "role-1")).rejects.toThrow(
      ForbiddenError,
    );
    expect(prismaMock.meeple.update).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(anonymiseMeepleRecordMock).not.toHaveBeenCalled();
  });
});

describe("recordResignation", () => {
  it("sets both resignedAt and membershipEndsAt", async () => {
    vi.setSystemTime(new Date("2026-07-29T12:00:00Z"));

    await recordResignation("meeple-1", new Date("2027-01-01T00:00:00Z"));

    expect(prismaMock.meeple.update).toHaveBeenCalledWith({
      where: { id: "meeple-1" },
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
  it("clears both date fields", async () => {
    await revokeResignation("meeple-1");

    expect(prismaMock.meeple.update).toHaveBeenCalledWith({
      where: { id: "meeple-1" },
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

describe("setMeepleRole", () => {
  it("swaps the meeple's UserRole row for the chosen role", async () => {
    prismaMock.meeple.findUniqueOrThrow.mockResolvedValue({
      neonAuthUserId: "user-1",
    } as never);
    prismaMock.role.findUniqueOrThrow.mockResolvedValue({
      id: "role-admin",
    } as never);

    expect(await setMeepleRole("meeple-1", "role-admin")).toEqual({
      success: true,
    });

    expect(prismaMock.userRole.deleteMany).toHaveBeenCalledWith({
      where: { neonAuthUserId: "user-1" },
    });
    expect(prismaMock.userRole.create).toHaveBeenCalledWith({
      data: { neonAuthUserId: "user-1", roleId: "role-admin" },
    });
  });

  it("refuses to assign a role to a Meeple without a login account", async () => {
    prismaMock.meeple.findUniqueOrThrow.mockResolvedValue({
      neonAuthUserId: null,
    } as never);
    prismaMock.role.findUniqueOrThrow.mockResolvedValue({
      id: "role-admin",
    } as never);

    expect(await setMeepleRole("meeple-1", "role-admin")).toEqual({
      error: "Dieses Mitglied hat kein Login-Konto.",
    });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
