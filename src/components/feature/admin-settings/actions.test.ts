import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: getCurrentUserMock }));

const { disconnectInstagram } = await import("./actions");

describe("disconnectInstagram", () => {
  it("rejects when the user lacks the instagram:connect permission", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(0);

    const result = await disconnectInstagram();

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(prismaMock.instagramConnection.deleteMany).not.toHaveBeenCalled();
  });

  it("deletes the active instagram connection when authorized", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);

    const result = await disconnectInstagram();

    expect(result).toEqual({ success: true });
    expect(prismaMock.instagramConnection.deleteMany).toHaveBeenCalledTimes(1);
  });
});
