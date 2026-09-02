import { beforeEach, describe, expect, it, vi } from "vitest";
import { PendingChangeKind } from "@prisma/client";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const requirePermissionMock = vi.fn();
vi.mock("@/lib/auth/permissions", () => ({
  requirePermission: (...args: unknown[]) => requirePermissionMock(...args),
}));

const approvePendingChangeRecordMock = vi.fn();
const rejectPendingChangeRecordMock = vi.fn();
const hasOpenInviteForMemberEmailMock = vi.fn();
vi.mock("@/lib/members/pending-changes", () => ({
  approvePendingChange: (...args: unknown[]) =>
    approvePendingChangeRecordMock(...args),
  rejectPendingChange: (...args: unknown[]) =>
    rejectPendingChangeRecordMock(...args),
  hasOpenInviteForMemberEmail: (...args: unknown[]) =>
    hasOpenInviteForMemberEmailMock(...args),
}));

const {
  approvePendingChange,
  checkOpenInviteBeforeApproval,
  rejectPendingChange,
} = await import("./pending-change-actions");

beforeEach(() => {
  requirePermissionMock.mockReset();
  approvePendingChangeRecordMock.mockReset();
  rejectPendingChangeRecordMock.mockReset();
  hasOpenInviteForMemberEmailMock.mockReset();
});

describe("approvePendingChange", () => {
  it("requires bank:read for an IBAN change", async () => {
    prismaMock.pendingChange.findUnique.mockResolvedValue({
      id: "pc-1",
      kind: PendingChangeKind.IBAN,
    } as never);
    requirePermissionMock.mockResolvedValue({ id: "admin-1" });
    approvePendingChangeRecordMock.mockResolvedValue({ success: true });

    const result = await approvePendingChange("pc-1");

    expect(result).toEqual({ success: true });
    expect(requirePermissionMock).toHaveBeenCalledWith("bank:read");
    expect(approvePendingChangeRecordMock).toHaveBeenCalledWith(
      "pc-1",
      "admin-1",
      undefined,
    );
  });

  it("requires members:manage for a MEMBER_EMAIL change", async () => {
    prismaMock.pendingChange.findUnique.mockResolvedValue({
      id: "pc-1",
      kind: PendingChangeKind.MEMBER_EMAIL,
    } as never);
    requirePermissionMock.mockResolvedValue({ id: "admin-1" });
    approvePendingChangeRecordMock.mockResolvedValue({ success: true });

    await approvePendingChange("pc-1");

    expect(requirePermissionMock).toHaveBeenCalledWith("members:manage");
  });

  it("reports a missing change without checking permissions", async () => {
    prismaMock.pendingChange.findUnique.mockResolvedValue(null);

    const result = await approvePendingChange("pc-1");

    expect(result).toEqual({ error: "Änderungsantrag nicht gefunden." });
    expect(requirePermissionMock).not.toHaveBeenCalled();
  });
});

describe("checkOpenInviteBeforeApproval (#362)", () => {
  it("is false for an IBAN change without checking anything else", async () => {
    prismaMock.pendingChange.findUnique.mockResolvedValue({
      id: "pc-1",
      memberId: "member-1",
      kind: PendingChangeKind.IBAN,
    } as never);

    expect(await checkOpenInviteBeforeApproval("pc-1")).toBe(false);
    expect(requirePermissionMock).not.toHaveBeenCalled();
    expect(hasOpenInviteForMemberEmailMock).not.toHaveBeenCalled();
  });

  it("requires members:manage before checking a MEMBER_EMAIL change", async () => {
    prismaMock.pendingChange.findUnique.mockResolvedValue({
      id: "pc-1",
      memberId: "member-1",
      kind: PendingChangeKind.MEMBER_EMAIL,
    } as never);
    requirePermissionMock.mockResolvedValue({ id: "admin-1" });
    hasOpenInviteForMemberEmailMock.mockResolvedValue(true);

    expect(await checkOpenInviteBeforeApproval("pc-1")).toBe(true);
    expect(requirePermissionMock).toHaveBeenCalledWith("members:manage");
    expect(hasOpenInviteForMemberEmailMock).toHaveBeenCalledWith("member-1");
  });

  it("is false without a matching change", async () => {
    prismaMock.pendingChange.findUnique.mockResolvedValue(null);

    expect(await checkOpenInviteBeforeApproval("pc-1")).toBe(false);
  });
});

describe("rejectPendingChange", () => {
  it("requires bank:read for an IBAN change and forwards the reason", async () => {
    prismaMock.pendingChange.findUnique.mockResolvedValue({
      id: "pc-1",
      kind: PendingChangeKind.IBAN,
    } as never);
    requirePermissionMock.mockResolvedValue({ id: "admin-1" });
    rejectPendingChangeRecordMock.mockResolvedValue({
      success: true,
      memberId: "member-1",
    });

    const result = await rejectPendingChange("pc-1", "unklar");

    expect(result).toEqual({ success: true });
    expect(rejectPendingChangeRecordMock).toHaveBeenCalledWith(
      "pc-1",
      "admin-1",
      "unklar",
    );
  });
});
