import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

// Eigene Datei statt in actions.test.ts (#166) — dort wäre die
// Zeilengrenze (max-lines) überschritten worden; Ort-Bearbeitung ist
// fachlich klar abgrenzbar von den übrigen LFG-Actions.
vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));

const requireMeeplePermissionMock = vi.fn();
vi.mock("@/lib/members/meeples", async () => {
  const actual = await vi.importActual<typeof import("@/lib/members/meeples")>(
    "@/lib/members/meeples",
  );
  return {
    ...actual,
    requireMeeplePermission: requireMeeplePermissionMock,
  };
});

const { updateLfgLocation, useOwnAddressAsLfgLocation } =
  await import("./actions");

const CREATOR = { id: "meeple-creator", neonAuthUserId: "auth-creator" };
const OTHER = { id: "meeple-other", neonAuthUserId: "auth-other" };

beforeEach(() => {
  requireMeeplePermissionMock.mockResolvedValue(CREATOR);
});

describe("updateLfgLocation", () => {
  function post(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      id: "post-1",
      createdByMeepleId: CREATOR.id,
      participantsMayEditLocation: false,
      description: "Suche Mitspielende",
      ...overrides,
    };
  }

  it("lets the creator set the location", async () => {
    prismaMock.lfgPost.findUnique.mockResolvedValue(post() as never);
    prismaMock.lfgPost.update.mockResolvedValue({} as never);

    const result = await updateLfgLocation("post-1", "Bei mir zuhause");

    expect(result).toEqual({ success: true });
    expect(prismaMock.lfgPost.update).toHaveBeenCalledWith({
      where: { id: "post-1" },
      data: { location: "Bei mir zuhause" },
    });
  });

  it("clears the location on blank input", async () => {
    prismaMock.lfgPost.findUnique.mockResolvedValue(post() as never);
    prismaMock.lfgPost.update.mockResolvedValue({} as never);

    await updateLfgLocation("post-1", "   ");

    expect(prismaMock.lfgPost.update).toHaveBeenCalledWith({
      where: { id: "post-1" },
      data: { location: null },
    });
  });

  it("rejects a non-creator when participantsMayEditLocation is off", async () => {
    requireMeeplePermissionMock.mockResolvedValue(OTHER);
    prismaMock.lfgPost.findUnique.mockResolvedValue(post() as never);

    const result = await updateLfgLocation("post-1", "Woanders");

    expect(result).toEqual({ error: "Nur der Ersteller darf den Ort ändern." });
    expect(prismaMock.lfgPost.update).not.toHaveBeenCalled();
  });

  it("lets a joined participant edit when participantsMayEditLocation is on", async () => {
    requireMeeplePermissionMock.mockResolvedValue(OTHER);
    prismaMock.lfgPost.findUnique.mockResolvedValue(
      post({ participantsMayEditLocation: true }) as never,
    );
    prismaMock.lfgParticipant.findFirst.mockResolvedValue({} as never);
    prismaMock.lfgPost.update.mockResolvedValue({} as never);

    const result = await updateLfgLocation("post-1", "Woanders");

    expect(result).toEqual({ success: true });
  });

  it("rejects a non-participant even when participantsMayEditLocation is on", async () => {
    requireMeeplePermissionMock.mockResolvedValue(OTHER);
    prismaMock.lfgPost.findUnique.mockResolvedValue(
      post({ participantsMayEditLocation: true }) as never,
    );
    prismaMock.lfgParticipant.findFirst.mockResolvedValue(null);

    const result = await updateLfgLocation("post-1", "Woanders");

    expect(result).toEqual({
      error: "Nur Teilnehmende können den Ort ändern.",
    });
    expect(prismaMock.lfgPost.update).not.toHaveBeenCalled();
  });
});

describe("useOwnAddressAsLfgLocation", () => {
  function post(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      id: "post-1",
      createdByMeepleId: CREATOR.id,
      participantsMayEditLocation: true,
      description: "Suche Mitspielende",
      ...overrides,
    };
  }

  it("rejects when the viewer has no address in their profile", async () => {
    requireMeeplePermissionMock.mockResolvedValue({
      ...CREATOR,
      address: null,
    });
    prismaMock.lfgPost.findUnique.mockResolvedValue(post() as never);

    const result = await useOwnAddressAsLfgLocation("post-1");

    expect(result).toEqual({
      error: "In deinem Profil ist keine Adresse hinterlegt.",
    });
    expect(prismaMock.lfgPost.update).not.toHaveBeenCalled();
  });

  it("sets the location without touching the description when there's no doorbell note", async () => {
    requireMeeplePermissionMock.mockResolvedValue({
      ...CREATOR,
      address: "Musterstraße 1",
      doorbellNote: null,
    });
    prismaMock.lfgPost.findUnique.mockResolvedValue(post() as never);
    prismaMock.lfgPost.update.mockResolvedValue({} as never);

    const result = await useOwnAddressAsLfgLocation("post-1");

    expect(result).toEqual({ success: true });
    expect(prismaMock.lfgPost.update).toHaveBeenCalledWith({
      where: { id: "post-1" },
      data: {
        location: "Musterstraße 1",
        description: "Suche Mitspielende",
      },
    });
  });

  it("appends the doorbell note to the description, keeping the existing text", async () => {
    requireMeeplePermissionMock.mockResolvedValue({
      ...CREATOR,
      address: "Musterstraße 1",
      doorbellNote: "bei Fam. Reiners",
    });
    prismaMock.lfgPost.findUnique.mockResolvedValue(post() as never);
    prismaMock.lfgPost.update.mockResolvedValue({} as never);

    await useOwnAddressAsLfgLocation("post-1");

    expect(prismaMock.lfgPost.update).toHaveBeenCalledWith({
      where: { id: "post-1" },
      data: {
        location: "Musterstraße 1",
        description: "Suche Mitspielende\n\nKlingelschild: bei Fam. Reiners",
      },
    });
  });

  it("rejects a non-participant even when participantsMayEditLocation is on", async () => {
    requireMeeplePermissionMock.mockResolvedValue({
      ...OTHER,
      address: "Musterstraße 1",
      doorbellNote: null,
    });
    prismaMock.lfgPost.findUnique.mockResolvedValue(post() as never);
    prismaMock.lfgParticipant.findFirst.mockResolvedValue(null);

    const result = await useOwnAddressAsLfgLocation("post-1");

    expect(result).toEqual({
      error: "Nur Teilnehmende können den Ort ändern.",
    });
    expect(prismaMock.lfgPost.update).not.toHaveBeenCalled();
  });
});
