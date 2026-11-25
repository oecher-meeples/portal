import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const afterMock = vi.fn();
vi.mock("next/server", () => ({
  after: (callback: () => unknown) => afterMock(callback),
}));

const getCurrentMeepleMock = vi.fn();
vi.mock("@/lib/members/meeples", () => ({
  getCurrentMeeple: () => getCurrentMeepleMock(),
}));

const actionPermissionDeniedMock = vi.fn();
vi.mock("@/lib/auth/action-guards", () => ({
  actionPermissionDenied: (...args: unknown[]) =>
    actionPermissionDeniedMock(...args),
}));

const enqueueMock = vi.fn();
const processQueueMock = vi.fn();
vi.mock("@/lib/ludothek/private-collection-import-queue", () => ({
  enqueuePrivateCollectionImport: (...args: unknown[]) => enqueueMock(...args),
  processPrivateCollectionImportQueue: () => processQueueMock(),
}));

const { syncPrivateBggCollection, adminSyncPrivateBggCollection } =
  await import("./private-collection-sync");

const MEEPLE = {
  id: "meeple-1",
  bggUsername: "lea_bgg",
  neonAuthUserId: "user-1",
  privateCollectionSyncedAt: null,
};
const TEN_MINUTES_AGO = new Date(Date.now() - 10 * 60 * 1000);
const QUEUED = { success: true, queued: true };

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentMeepleMock.mockResolvedValue(MEEPLE);
  actionPermissionDeniedMock.mockResolvedValue(null);
  enqueueMock.mockResolvedValue({ created: true, jobId: "job-1" });
  prismaMock.role.count.mockResolvedValue(0);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("syncPrivateBggCollection (#255, #632)", () => {
  it("rejects when not logged in", async () => {
    getCurrentMeepleMock.mockResolvedValue(null);

    expect(await syncPrivateBggCollection()).toEqual({
      error: "Keine Berechtigung.",
    });
    expect(enqueueMock).not.toHaveBeenCalled();
  });

  it("rejects when no bggUsername is set", async () => {
    getCurrentMeepleMock.mockResolvedValue({ ...MEEPLE, bggUsername: null });

    expect(await syncPrivateBggCollection()).toEqual({
      error: "Bitte zuerst einen BGG-Benutzernamen im Profil hinterlegen.",
    });
    expect(enqueueMock).not.toHaveBeenCalled();
  });

  it("queues the import and starts the worker after the response", async () => {
    const result = await syncPrivateBggCollection();

    expect(result).toEqual(QUEUED);
    expect(enqueueMock).toHaveBeenCalledWith("meeple-1");
    expect(afterMock).toHaveBeenCalledTimes(1);

    await afterMock.mock.calls[0][0]();
    expect(processQueueMock).toHaveBeenCalledTimes(1);
  });

  it("rejects within the 1h cooldown window", async () => {
    getCurrentMeepleMock.mockResolvedValue({
      ...MEEPLE,
      privateCollectionSyncedAt: TEN_MINUTES_AGO,
    });

    const result = await syncPrivateBggCollection();

    expect("error" in result && result.error).toContain("Cooldown");
    expect(enqueueMock).not.toHaveBeenCalled();
  });

  it("exempts sysadmin from the cooldown", async () => {
    getCurrentMeepleMock.mockResolvedValue({
      ...MEEPLE,
      privateCollectionSyncedAt: TEN_MINUTES_AGO,
    });
    prismaMock.role.count.mockResolvedValue(1);

    expect(await syncPrivateBggCollection()).toEqual(QUEUED);
  });

  it("ignores ignoreCooldown=true for someone not allowed to force it (production, no sysadmin)", async () => {
    vi.stubEnv("NODE_ENV", "production");
    getCurrentMeepleMock.mockResolvedValue({
      ...MEEPLE,
      privateCollectionSyncedAt: TEN_MINUTES_AGO,
    });

    const result = await syncPrivateBggCollection(true);

    expect("error" in result && result.error).toContain("Cooldown");
    expect(enqueueMock).not.toHaveBeenCalled();
  });

  it("honors ignoreCooldown=true for a sysadmin in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    getCurrentMeepleMock.mockResolvedValue({
      ...MEEPLE,
      privateCollectionSyncedAt: TEN_MINUTES_AGO,
    });
    prismaMock.role.count.mockResolvedValue(1);

    expect(await syncPrivateBggCollection(true)).toEqual(QUEUED);
  });

  it("allows importing again once the cooldown has passed", async () => {
    getCurrentMeepleMock.mockResolvedValue({
      ...MEEPLE,
      privateCollectionSyncedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    });

    expect(await syncPrivateBggCollection()).toEqual(QUEUED);
  });
});

describe("adminSyncPrivateBggCollection (#632)", () => {
  it("rejects without members:manage", async () => {
    actionPermissionDeniedMock.mockResolvedValue({
      error: "Keine Berechtigung.",
    });

    expect(await adminSyncPrivateBggCollection("meeple-2")).toEqual({
      error: "Keine Berechtigung.",
    });
    expect(actionPermissionDeniedMock).toHaveBeenCalledWith("members:manage");
    expect(enqueueMock).not.toHaveBeenCalled();
  });

  it("rejects when the target has no bggUsername", async () => {
    prismaMock.meeple.findUnique.mockResolvedValue({
      bggUsername: null,
    } as never);

    expect(await adminSyncPrivateBggCollection("meeple-2")).toEqual({
      error: "Für dieses Mitglied ist kein BGG-Benutzername hinterlegt.",
    });
    expect(enqueueMock).not.toHaveBeenCalled();
  });

  it("queues an import for the target meeple, ignoring the cooldown", async () => {
    prismaMock.meeple.findUnique.mockResolvedValue({
      bggUsername: "andre_bgg",
    } as never);

    expect(await adminSyncPrivateBggCollection("meeple-2")).toEqual(QUEUED);
    expect(enqueueMock).toHaveBeenCalledWith("meeple-2");
    expect(afterMock).toHaveBeenCalledTimes(1);
  });
});
