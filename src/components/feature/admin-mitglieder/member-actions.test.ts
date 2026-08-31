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

const { createMember } = await import("./member-actions");

class ForbiddenError extends Error {}

beforeEach(() => {
  requirePermissionMock.mockReset().mockResolvedValue({ id: "admin-user" });
  createMemberRecordMock.mockReset().mockResolvedValue({
    success: true,
    memberId: "member-1",
  });
});

describe("createMember", () => {
  it("requires members:manage", async () => {
    requirePermissionMock.mockRejectedValue(new ForbiddenError("/403"));

    await expect(
      createMember({ email: "erika@example.com" }),
    ).rejects.toThrow(ForbiddenError);
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
