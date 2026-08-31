import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const requirePermissionMock = vi.fn();
vi.mock("@/lib/auth/permissions", () => ({
  requirePermission: (...args: unknown[]) => requirePermissionMock(...args),
}));

const createMemberRecordMock = vi.fn();
vi.mock("@/lib/members/create-member", () => ({
  createMember: (...args: unknown[]) => createMemberRecordMock(...args),
}));

const updateMemberRecordMock = vi.fn();
vi.mock("@/lib/members/update-member", () => ({
  updateMember: (...args: unknown[]) => updateMemberRecordMock(...args),
}));

const sendSelbstauskunftMailMock = vi.fn();
vi.mock("@/lib/members/selbstauskunft-mail", () => ({
  sendSelbstauskunftMail: (...args: unknown[]) =>
    sendSelbstauskunftMailMock(...args),
}));

const { createMember, updateMember, sendSelbstauskunft } =
  await import("./member-actions");

class ForbiddenError extends Error {}

beforeEach(() => {
  requirePermissionMock.mockReset().mockResolvedValue({ id: "admin-user" });
  createMemberRecordMock.mockReset().mockResolvedValue({
    success: true,
    memberId: "member-1",
  });
  updateMemberRecordMock.mockReset().mockResolvedValue({ success: true });
  sendSelbstauskunftMailMock.mockReset().mockResolvedValue({ success: true });
});

describe("createMember", () => {
  it("requires members:manage", async () => {
    requirePermissionMock.mockRejectedValue(new ForbiddenError("/403"));

    await expect(createMember({ email: "erika@example.com" })).rejects.toThrow(
      ForbiddenError,
    );
    expect(createMemberRecordMock).not.toHaveBeenCalled();
  });

  it("delegates to the shared rule and revalidates on success", async () => {
    const result = await createMember({ email: "erika@example.com" });

    expect(result).toEqual({ success: true });
    expect(createMemberRecordMock).toHaveBeenCalledWith({
      email: "erika@example.com",
    });
  });

  it("passes a rule violation straight back", async () => {
    createMemberRecordMock.mockResolvedValue({
      error: "Für erika@example.com existiert bereits ein Vereinsmitglied.",
    });

    expect(await createMember({ email: "erika@example.com" })).toEqual({
      error: "Für erika@example.com existiert bereits ein Vereinsmitglied.",
    });
  });
});

describe("updateMember", () => {
  it("requires members:manage", async () => {
    requirePermissionMock.mockRejectedValue(new ForbiddenError("/403"));

    await expect(
      updateMember("member-1", { email: "erika@example.com" }),
    ).rejects.toThrow(ForbiddenError);
    expect(updateMemberRecordMock).not.toHaveBeenCalled();
  });

  it("delegates to the shared rule and revalidates on success", async () => {
    const result = await updateMember("member-1", {
      email: "erika@example.com",
    });

    expect(result).toEqual({ success: true });
    expect(updateMemberRecordMock).toHaveBeenCalledWith("member-1", {
      email: "erika@example.com",
    });
  });

  it("passes a rule violation straight back", async () => {
    updateMemberRecordMock.mockResolvedValue({
      error:
        "Für erika@example.com existiert bereits ein anderes Vereinsmitglied.",
    });

    expect(
      await updateMember("member-1", { email: "erika@example.com" }),
    ).toEqual({
      error:
        "Für erika@example.com existiert bereits ein anderes Vereinsmitglied.",
    });
  });
});

describe("sendSelbstauskunft", () => {
  it("requires members:manage", async () => {
    requirePermissionMock.mockRejectedValue(new ForbiddenError("/403"));

    await expect(sendSelbstauskunft("meeple-1")).rejects.toThrow(
      ForbiddenError,
    );
    expect(sendSelbstauskunftMailMock).not.toHaveBeenCalled();
  });

  it("delegates to the shared mail rule", async () => {
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
