import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { getDefaultInviteDays, setDefaultInviteDays } =
  await import("@/lib/members/invite-settings");

describe("getDefaultInviteDays", () => {
  it("upserts the singleton row and returns its defaultDays", async () => {
    prismaMock.inviteSettings.upsert.mockResolvedValue({
      id: "singleton",
      defaultDays: 14,
      updatedAt: new Date(),
    });

    const days = await getDefaultInviteDays();

    expect(days).toBe(14);
    expect(prismaMock.inviteSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "singleton" } }),
    );
  });
});

describe("setDefaultInviteDays", () => {
  it("upserts the singleton row with the new value", async () => {
    prismaMock.inviteSettings.upsert.mockResolvedValue({
      id: "singleton",
      defaultDays: 3,
      updatedAt: new Date(),
    });

    await setDefaultInviteDays(3);

    expect(prismaMock.inviteSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "singleton" },
        update: { defaultDays: 3 },
        create: { id: "singleton", defaultDays: 3 },
      }),
    );
  });
});
