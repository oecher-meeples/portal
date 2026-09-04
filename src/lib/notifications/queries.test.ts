import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const isTriggeredMock = vi.fn();
const messageMock = vi.fn();
vi.mock("@/lib/notifications/registry", () => ({
  AUTOMATED_NOTIFICATIONS: [
    {
      name: "db-fill-level",
      type: "danger" as const,
      audiencePermissionKey: "admin:access",
      closeable: "no" as const,
      isTriggered: (...args: unknown[]) => isTriggeredMock(...args),
      message: (...args: unknown[]) => messageMock(...args),
    },
  ],
}));

const { listActiveNotificationsForViewer } = await import("./queries");

function makeManualRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "notif-1",
    name: "Wartung",
    type: "INFO" as const,
    audiencePermissionKey: null,
    closeable: "YES" as const,
    message: "Geplante Wartung am Wochenende.",
    isActive: true,
    createdAt: new Date("2026-01-01"),
    ...overrides,
  };
}

describe("listActiveNotificationsForViewer (#339)", () => {
  beforeEach(() => {
    isTriggeredMock.mockReset();
    messageMock.mockReset();
  });

  it("includes a manual notification with no audience restriction for a guest (no permissions)", async () => {
    prismaMock.systemNotification.findMany.mockResolvedValue([makeManualRow()]);
    prismaMock.automatedNotificationDisable.findMany.mockResolvedValue([]);
    isTriggeredMock.mockResolvedValue(false);

    const result = await listActiveNotificationsForViewer([]);

    expect(result).toEqual([
      {
        id: "manual:notif-1",
        type: "info",
        closeable: "yes",
        message: "Geplante Wartung am Wochenende.",
      },
    ]);
  });

  it("hides a manual notification whose audience permission the viewer lacks", async () => {
    prismaMock.systemNotification.findMany.mockResolvedValue([
      makeManualRow({ audiencePermissionKey: "bank:read" }),
    ]);
    prismaMock.automatedNotificationDisable.findMany.mockResolvedValue([]);

    const result = await listActiveNotificationsForViewer(["events:manage"]);

    expect(result).toEqual([]);
  });

  it("shows a manual notification once the viewer has the required permission", async () => {
    prismaMock.systemNotification.findMany.mockResolvedValue([
      makeManualRow({ audiencePermissionKey: "bank:read" }),
    ]);
    prismaMock.automatedNotificationDisable.findMany.mockResolvedValue([]);

    const result = await listActiveNotificationsForViewer(["bank:read"]);

    expect(result).toHaveLength(1);
  });

  it("only queries active manual notifications", async () => {
    prismaMock.systemNotification.findMany.mockResolvedValue([]);
    prismaMock.automatedNotificationDisable.findMany.mockResolvedValue([]);

    await listActiveNotificationsForViewer([]);

    expect(prismaMock.systemNotification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: true } }),
    );
  });

  it("includes a triggered, non-disabled automated notification for an eligible viewer", async () => {
    prismaMock.systemNotification.findMany.mockResolvedValue([]);
    prismaMock.automatedNotificationDisable.findMany.mockResolvedValue([]);
    isTriggeredMock.mockResolvedValue(true);
    messageMock.mockResolvedValue("DB-Füllstand kritisch: 92%");

    const result = await listActiveNotificationsForViewer(["admin:access"]);

    expect(result).toEqual([
      {
        id: "automated:db-fill-level",
        type: "danger",
        closeable: "no",
        message: "DB-Füllstand kritisch: 92%",
      },
    ]);
  });

  it("excludes an automated notification the viewer isn't in the audience for", async () => {
    prismaMock.systemNotification.findMany.mockResolvedValue([]);
    isTriggeredMock.mockResolvedValue(true);

    const result = await listActiveNotificationsForViewer([]);

    expect(result).toEqual([]);
    expect(isTriggeredMock).not.toHaveBeenCalled();
  });

  it("excludes an automated notification that is disabled, even if triggered", async () => {
    prismaMock.systemNotification.findMany.mockResolvedValue([]);
    prismaMock.automatedNotificationDisable.findMany.mockResolvedValue([
      { name: "db-fill-level", disabledAt: new Date("2026-01-01") },
    ]);
    isTriggeredMock.mockResolvedValue(true);

    const result = await listActiveNotificationsForViewer(["admin:access"]);

    expect(result).toEqual([]);
    expect(isTriggeredMock).not.toHaveBeenCalled();
  });

  it("excludes an automated notification whose condition isn't triggered", async () => {
    prismaMock.systemNotification.findMany.mockResolvedValue([]);
    prismaMock.automatedNotificationDisable.findMany.mockResolvedValue([]);
    isTriggeredMock.mockResolvedValue(false);

    const result = await listActiveNotificationsForViewer(["admin:access"]);

    expect(result).toEqual([]);
  });
});
