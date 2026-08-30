import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const requirePermissionMock = vi.fn();
vi.mock("@/lib/auth/permissions", () => ({
  requirePermission: (...args: unknown[]) => requirePermissionMock(...args),
}));

const createUserMock = vi.fn();
const requestPasswordResetMock = vi.fn();
vi.mock("@/lib/auth/server", () => ({
  auth: {
    admin: { createUser: (...args: unknown[]) => createUserMock(...args) },
    requestPasswordReset: (...args: unknown[]) =>
      requestPasswordResetMock(...args),
  },
}));

const { createSystemkonto } = await import("@/lib/members/systemkonto");

describe("createSystemkonto", () => {
  it("rejects a missing display name", async () => {
    const result = await createSystemkonto({
      email: "bot@example.com",
      displayName: "  ",
    });

    expect(result).toEqual({ error: "Bitte einen Anzeigenamen angeben." });
    expect(createUserMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid email", async () => {
    const result = await createSystemkonto({
      email: "not-an-email",
      displayName: "Kassenbot",
    });

    expect(result).toEqual({ error: "Ungültige E-Mail-Adresse." });
    expect(createUserMock).not.toHaveBeenCalled();
  });

  it("surfaces the error when the auth service rejects user creation", async () => {
    createUserMock.mockResolvedValue({
      data: null,
      error: { message: "FORBIDDEN" },
    });

    const result = await createSystemkonto({
      email: "bot@example.com",
      displayName: "Kassenbot",
    });

    expect(result).toEqual({
      error: "Systemkonto konnte nicht angelegt werden: FORBIDDEN",
    });
    expect(prismaMock.meeple.create).not.toHaveBeenCalled();
  });

  it("creates the auth user, the Meeple and triggers a password reset", async () => {
    createUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    prismaMock.meeple.create.mockResolvedValue({ id: "meeple-1" } as never);

    const result = await createSystemkonto({
      email: "Bot@Example.com",
      displayName: "Kassenbot",
    });

    expect(result).toEqual({ success: true, meepleId: "meeple-1" });
    expect(createUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "bot@example.com",
        name: "Kassenbot",
      }),
    );
    expect(prismaMock.meeple.create).toHaveBeenCalledWith({
      data: { neonAuthUserId: "user-1", displayName: "Kassenbot" },
    });
    expect(requestPasswordResetMock).toHaveBeenCalledWith({
      email: "bot@example.com",
    });
  });
});
