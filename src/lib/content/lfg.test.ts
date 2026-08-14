import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const {
  getLfgStatus,
  isLfgExpired,
  getLfgParticipantDisplayName,
  getOpenLfgPostsForBoardGame,
  getBoardGameIdsWithOpenLfgPosts,
} = await import("./lfg");

const NOW = new Date("2026-08-01T12:00:00Z");

describe("isLfgExpired", () => {
  it("is false when there is no planned date", () => {
    expect(isLfgExpired({ plannedAt: null }, NOW)).toBe(false);
  });

  it("is true once the planned date is in the past", () => {
    expect(
      isLfgExpired({ plannedAt: new Date("2026-07-01T00:00:00Z") }, NOW),
    ).toBe(true);
  });

  it("is false while the planned date is still ahead", () => {
    expect(
      isLfgExpired({ plannedAt: new Date("2026-09-01T00:00:00Z") }, NOW),
    ).toBe(false);
  });
});

describe("getLfgStatus", () => {
  const base = { maxParticipants: 4, plannedAt: null, closedAt: null };

  it("is offen with free slots and no expiry", () => {
    expect(getLfgStatus(base, 2, NOW)).toBe("offen");
  });

  it("is voll once the slots are filled", () => {
    expect(getLfgStatus(base, 4, NOW)).toBe("voll");
  });

  it("is abgelaufen once the planned date has passed, even with free slots", () => {
    expect(
      getLfgStatus(
        { ...base, plannedAt: new Date("2026-07-01T00:00:00Z") },
        1,
        NOW,
      ),
    ).toBe("abgelaufen");
  });

  it("never expires without a planned date", () => {
    expect(getLfgStatus({ ...base, plannedAt: null }, 1, NOW)).toBe("offen");
  });

  it("is geschlossen once closedAt is set, taking priority over everything else", () => {
    expect(
      getLfgStatus(
        { ...base, closedAt: new Date("2026-07-01T00:00:00Z") },
        1,
        NOW,
      ),
    ).toBe("geschlossen");
  });
});

describe("getLfgParticipantDisplayName", () => {
  it("uses the member's own name for a real participant", () => {
    expect(
      getLfgParticipantDisplayName({
        meepleId: "meeple-1",
        meepleDisplayName: "Anna",
        addedByDisplayName: "Ben",
      }),
    ).toBe("Anna");
  });

  it("generates 'Gast von {name}' for anonymous guests, never free text", () => {
    expect(
      getLfgParticipantDisplayName({
        meepleId: null,
        meepleDisplayName: null,
        addedByDisplayName: "Ben",
      }),
    ).toBe("Gast von Ben");
  });
});

describe("getOpenLfgPostsForBoardGame", () => {
  function post(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      id: "post-1",
      title: "Wer hat Lust auf Arche Nova?",
      dateNote: "Nächsten Dienstag",
      plannedAt: null,
      location: "Vereinsraum",
      maxParticipants: 4,
      closedAt: null,
      _count: { participants: 1 },
      ...overrides,
    };
  }

  it("returns only posts whose status is offen", async () => {
    prismaMock.lfgPost.findMany.mockResolvedValue([
      post({ id: "open-1" }),
      post({ id: "voll-1", maxParticipants: 1, _count: { participants: 1 } }),
      post({
        id: "abgelaufen-1",
        plannedAt: new Date("2020-01-01T00:00:00Z"),
      }),
    ] as never);

    const result = await getOpenLfgPostsForBoardGame("board-1");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("open-1");
  });

  it("excludes geschlossen posts at the query level", async () => {
    prismaMock.lfgPost.findMany.mockResolvedValue([] as never);

    await getOpenLfgPostsForBoardGame("board-1");

    expect(prismaMock.lfgPost.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { boardGameId: "board-1", closedAt: null },
      }),
    );
  });

  it("maps the participant count correctly", async () => {
    prismaMock.lfgPost.findMany.mockResolvedValue([
      post({ _count: { participants: 3 } }),
    ] as never);

    const result = await getOpenLfgPostsForBoardGame("board-1");

    expect(result[0].participantCount).toBe(3);
  });

  it("returns an empty array when nothing matches", async () => {
    prismaMock.lfgPost.findMany.mockResolvedValue([] as never);

    expect(await getOpenLfgPostsForBoardGame("board-1")).toEqual([]);
  });
});

describe("getBoardGameIdsWithOpenLfgPosts", () => {
  function post(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      id: "post-1",
      boardGameId: "board-1",
      plannedAt: null,
      maxParticipants: 4,
      closedAt: null,
      _count: { participants: 1 },
      ...overrides,
    };
  }

  it("returns an empty set without querying for an empty input", async () => {
    const result = await getBoardGameIdsWithOpenLfgPosts([]);

    expect(result).toEqual(new Set());
    expect(prismaMock.lfgPost.findMany).not.toHaveBeenCalled();
  });

  it("includes a game with at least one offen post", async () => {
    prismaMock.lfgPost.findMany.mockResolvedValue([
      post({ boardGameId: "board-1" }),
    ] as never);

    const result = await getBoardGameIdsWithOpenLfgPosts(["board-1"]);

    expect(result.has("board-1")).toBe(true);
  });

  it("excludes a game whose only posts are voll, abgelaufen or geschlossen", async () => {
    prismaMock.lfgPost.findMany.mockResolvedValue([
      post({
        boardGameId: "board-1",
        maxParticipants: 1,
        _count: { participants: 1 },
      }),
      post({
        boardGameId: "board-2",
        plannedAt: new Date("2020-01-01T00:00:00Z"),
      }),
    ] as never);

    const result = await getBoardGameIdsWithOpenLfgPosts([
      "board-1",
      "board-2",
    ]);

    expect(result.size).toBe(0);
  });

  it("scopes the query to the requested board games and open posts", async () => {
    prismaMock.lfgPost.findMany.mockResolvedValue([] as never);

    await getBoardGameIdsWithOpenLfgPosts(["board-1", "board-2"]);

    expect(prismaMock.lfgPost.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          boardGameId: { in: ["board-1", "board-2"] },
          closedAt: null,
        },
      }),
    );
  });
});
