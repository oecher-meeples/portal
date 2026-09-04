import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/auth/permissions", () => ({ hasPermission: vi.fn() }));
vi.mock("@/lib/notifications/registry", () => ({
  AUTOMATED_NOTIFICATIONS: [
    {
      name: "db-fill-level",
      type: "danger" as const,
      closeable: "no" as const,
      isTriggered: vi.fn(),
      message: vi.fn(),
    },
  ],
}));

const { getCurrentUser } = await import("@/lib/auth/server");
const { hasPermission } = await import("@/lib/auth/permissions");
const {
  createManualNotification,
  setManualNotificationActive,
  deleteManualNotification,
  setAutomatedNotificationDisabled,
} = await import("./actions");

function grantPermission() {
  vi.mocked(getCurrentUser).mockResolvedValue({ id: "admin-1" } as never);
  vi.mocked(hasPermission).mockResolvedValue(true);
}

function denyPermission() {
  vi.mocked(getCurrentUser).mockResolvedValue(null);
}

const MANUAL_INPUT = {
  name: "Wartung",
  type: "info" as const,
  audiencePermissionKey: null,
  closeable: "yes" as const,
  message: "Geplante Wartung.",
};

describe("createManualNotification (#339)", () => {
  it("requires notifications:manage", async () => {
    denyPermission();

    const result = await createManualNotification(MANUAL_INPUT);

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(prismaMock.systemNotification.create).not.toHaveBeenCalled();
  });

  it("creates the row with the mapped Prisma enum values", async () => {
    grantPermission();

    const result = await createManualNotification(MANUAL_INPUT);

    expect(prismaMock.systemNotification.create).toHaveBeenCalledWith({
      data: {
        name: "Wartung",
        type: "INFO",
        audiencePermissionKey: null,
        closeable: "YES",
        message: "Geplante Wartung.",
      },
    });
    expect(result).toEqual({ success: true });
  });
});

describe("setManualNotificationActive (#339)", () => {
  it("requires notifications:manage", async () => {
    denyPermission();

    const result = await setManualNotificationActive("notif-1", false);

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(prismaMock.systemNotification.update).not.toHaveBeenCalled();
  });

  it("updates isActive", async () => {
    grantPermission();

    await setManualNotificationActive("notif-1", false);

    expect(prismaMock.systemNotification.update).toHaveBeenCalledWith({
      where: { id: "notif-1" },
      data: { isActive: false },
    });
  });
});

describe("deleteManualNotification (#339)", () => {
  it("requires notifications:manage", async () => {
    denyPermission();

    const result = await deleteManualNotification("notif-1");

    expect(result).toEqual({ error: "Keine Berechtigung." });
    expect(prismaMock.systemNotification.delete).not.toHaveBeenCalled();
  });

  it("deletes the row", async () => {
    grantPermission();

    await deleteManualNotification("notif-1");

    expect(prismaMock.systemNotification.delete).toHaveBeenCalledWith({
      where: { id: "notif-1" },
    });
  });
});

describe("setAutomatedNotificationDisabled (#339)", () => {
  it("requires notifications:manage", async () => {
    denyPermission();

    const result = await setAutomatedNotificationDisabled(
      "db-fill-level",
      true,
    );

    expect(result).toEqual({ error: "Keine Berechtigung." });
  });

  it("rejects an unknown registry name", async () => {
    grantPermission();

    const result = await setAutomatedNotificationDisabled("unknown", true);

    expect(result).toEqual({
      error: "Unbekannte automatisierte Notification.",
    });
    expect(
      prismaMock.automatedNotificationDisable.upsert,
    ).not.toHaveBeenCalled();
  });

  it("upserts a disable row when disabling", async () => {
    grantPermission();

    await setAutomatedNotificationDisabled("db-fill-level", true);

    expect(prismaMock.automatedNotificationDisable.upsert).toHaveBeenCalledWith(
      {
        where: { name: "db-fill-level" },
        create: { name: "db-fill-level" },
        update: {},
      },
    );
  });

  it("deletes the disable row when re-enabling — the code stays unchanged either way", async () => {
    grantPermission();

    await setAutomatedNotificationDisabled("db-fill-level", false);

    expect(
      prismaMock.automatedNotificationDisable.deleteMany,
    ).toHaveBeenCalledWith({ where: { name: "db-fill-level" } });
  });
});
