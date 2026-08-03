import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const resolveScannedCodeMock = vi.fn();
vi.mock("@/lib/ludothek/holdings", () => ({
  resolveScannedCode: (...args: unknown[]) => resolveScannedCodeMock(...args),
}));

const isGameInEventRoomMock = vi.fn();
const getAttendingExplainersMock = vi.fn();
vi.mock("@/lib/events/guest-area", () => ({
  isGameInEventRoom: (...args: unknown[]) => isGameInEventRoomMock(...args),
  getAttendingExplainers: (...args: unknown[]) =>
    getAttendingExplainersMock(...args),
}));

const isEventCurrentlyRunningMock = vi.fn();
vi.mock("@/lib/events/upcoming", () => ({
  isEventCurrentlyRunning: (...args: unknown[]) =>
    isEventCurrentlyRunningMock(...args),
}));

const { lookupGuestGame, getGuestGameDetail } = await import("./actions");

describe("lookupGuestGame", () => {
  it("returns a selection list for multiple matches of the same EAN", async () => {
    resolveScannedCodeMock.mockResolvedValue({
      kind: "games",
      games: [
        { id: "game-1", slug: "wingspan", title: "Wingspan", imageUrl: null },
        { id: "game-2", slug: "wingspan-2", title: "Wingspan", imageUrl: null },
      ],
    });

    const result = await lookupGuestGame("1234567890123");

    expect(result.kind).toBe("games");
    if (result.kind === "games") {
      expect(result.games).toHaveLength(2);
    }
  });

  it("never surfaces storage-unit contents to guests", async () => {
    resolveScannedCodeMock.mockResolvedValue({
      kind: "unit",
      unit: { id: "unit-1" },
      contents: [{ id: "game-1" }],
    });

    const result = await lookupGuestGame("OM-BOX-0001");

    expect(result).toEqual({ kind: "unknown" });
  });

  it("returns unknown for an unresolvable code", async () => {
    resolveScannedCodeMock.mockResolvedValue({ kind: "unknown", raw: "xyz" });

    const result = await lookupGuestGame("xyz");

    expect(result).toEqual({ kind: "unknown" });
  });
});

describe("getGuestGameDetail", () => {
  beforeEach(() => {
    isEventCurrentlyRunningMock.mockResolvedValue(true);
    isGameInEventRoomMock.mockResolvedValue(true);
    getAttendingExplainersMock.mockResolvedValue([]);
  });

  it("returns null for an event that isn't currently running", async () => {
    isEventCurrentlyRunningMock.mockResolvedValue(false);

    expect(await getGuestGameDetail("event-past", "game-1")).toBeNull();
    expect(prismaMock.boardGame.findUnique).not.toHaveBeenCalled();
  });

  it("returns null for an unknown game", async () => {
    prismaMock.boardGame.findUnique.mockResolvedValue(null);

    expect(await getGuestGameDetail("event-1", "missing")).toBeNull();
  });

  it("combines room status and attending explainers for the game", async () => {
    prismaMock.boardGame.findUnique.mockResolvedValue({
      id: "game-1",
      title: "Azul",
      imageUrl: null,
      description: null,
      minPlayers: 2,
      maxPlayers: 4,
      playTimeMinutes: 45,
      explainerVideoUrl: "https://www.youtube.com/watch?v=abc",
    } as never);

    const result = await getGuestGameDetail("event-1", "game-1");

    expect(result?.isInRoom).toBe(true);
    expect(result?.explainerVideoUrl).toBe(
      "https://www.youtube.com/watch?v=abc",
    );
  });
});
