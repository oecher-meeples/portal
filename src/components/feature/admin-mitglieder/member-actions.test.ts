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

const listGuardiansOfMock = vi.fn();
const listGuardianCandidatesMock = vi.fn();
const addGuardianLinkMock = vi.fn();
const removeGuardianLinkMock = vi.fn();
vi.mock("@/lib/members/guardians", () => ({
  listGuardiansOf: (...args: unknown[]) => listGuardiansOfMock(...args),
  listGuardianCandidates: (...args: unknown[]) =>
    listGuardianCandidatesMock(...args),
  addGuardianLink: (...args: unknown[]) => addGuardianLinkMock(...args),
  removeGuardianLink: (...args: unknown[]) => removeGuardianLinkMock(...args),
}));

const {
  createMember,
  updateMember,
  sendSelbstauskunft,
  listGuardianManagement,
  addGuardian,
  removeGuardian,
} = await import("./member-actions");

class ForbiddenError extends Error {}

beforeEach(() => {
  requirePermissionMock.mockReset().mockResolvedValue({ id: "admin-user" });
  createMemberRecordMock.mockReset().mockResolvedValue({
    success: true,
    memberId: "member-1",
  });
  updateMemberRecordMock.mockReset().mockResolvedValue({ success: true });
  sendSelbstauskunftMailMock.mockReset().mockResolvedValue({ success: true });
  listGuardiansOfMock.mockReset().mockResolvedValue([]);
  listGuardianCandidatesMock.mockReset().mockResolvedValue([]);
  addGuardianLinkMock.mockReset().mockResolvedValue(undefined);
  removeGuardianLinkMock.mockReset().mockResolvedValue(undefined);
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

describe("listGuardianManagement (#372)", () => {
  it("requires members:manage", async () => {
    requirePermissionMock.mockRejectedValue(new ForbiddenError("/403"));

    await expect(listGuardianManagement("child-1")).rejects.toThrow(
      ForbiddenError,
    );
  });

  it("returns guardians and candidates for the child", async () => {
    listGuardiansOfMock.mockResolvedValue([
      { id: "guardian-1", displayName: "Erika Muster" },
    ]);
    listGuardianCandidatesMock.mockResolvedValue([
      { id: "guardian-2", displayName: "Max Muster" },
    ]);

    const result = await listGuardianManagement("child-1");

    expect(result).toEqual({
      guardians: [{ id: "guardian-1", displayName: "Erika Muster" }],
      candidates: [{ id: "guardian-2", displayName: "Max Muster" }],
    });
    expect(listGuardiansOfMock).toHaveBeenCalledWith("child-1");
    expect(listGuardianCandidatesMock).toHaveBeenCalledWith("child-1");
  });
});

describe("addGuardian / removeGuardian (#372)", () => {
  it("requires members:manage for add", async () => {
    requirePermissionMock.mockRejectedValue(new ForbiddenError("/403"));

    await expect(addGuardian("child-1", "guardian-1")).rejects.toThrow(
      ForbiddenError,
    );
    expect(addGuardianLinkMock).not.toHaveBeenCalled();
  });

  it("adds the link", async () => {
    expect(await addGuardian("child-1", "guardian-1")).toEqual({
      success: true,
    });
    expect(addGuardianLinkMock).toHaveBeenCalledWith("child-1", "guardian-1");
  });

  it("requires members:manage for remove", async () => {
    requirePermissionMock.mockRejectedValue(new ForbiddenError("/403"));

    await expect(removeGuardian("child-1", "guardian-1")).rejects.toThrow(
      ForbiddenError,
    );
    expect(removeGuardianLinkMock).not.toHaveBeenCalled();
  });

  it("removes the link", async () => {
    expect(await removeGuardian("child-1", "guardian-1")).toEqual({
      success: true,
    });
    expect(removeGuardianLinkMock).toHaveBeenCalledWith(
      "child-1",
      "guardian-1",
    );
  });
});
