import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const deniedMock = vi.fn();
vi.mock("@/lib/auth/action-guards", () => ({
  actionPermissionDenied: (...args: unknown[]) => deniedMock(...args),
}));
vi.mock("@/lib/members/meeples", () => ({
  requireMeeple: () => Promise.resolve({ id: "session-meeple" }),
}));

const listMock = vi.fn();
const removeMock = vi.fn();
const clearMock = vi.fn();
vi.mock("@/lib/ludothek/want-to-play-list", () => ({
  listWantToPlay: (...args: unknown[]) => listMock(...args),
  removeWantToPlay: (...args: unknown[]) => removeMock(...args),
  clearWantToPlay: (...args: unknown[]) => clearMock(...args),
}));

const {
  clearWantToPlayAction,
  loadMoreWantToPlayAction,
  removeWantToPlayEntryAction,
} = await import("./want-to-play-list-actions");

beforeEach(() => {
  vi.clearAllMocks();
  deniedMock.mockResolvedValue(null);
});

describe("Want-to-Play-Listen-Actions (#637)", () => {
  it("lädt eine fremde Liste nur mit Berechtigung nach", async () => {
    deniedMock.mockResolvedValue({ error: "Keine Berechtigung." });

    expect(
      await loadMoreWantToPlayAction("other", {
        cursor: { title: "A", id: "1" },
      }),
    ).toEqual({ error: "Keine Berechtigung." });
    expect(listMock).not.toHaveBeenCalled();
  });

  it("lädt die nächste Seite hinter dem Cursor", async () => {
    listMock.mockResolvedValue({ items: [], nextCursor: null });

    const result = await loadMoreWantToPlayAction("other", {
      cursor: { title: "A", id: "1" },
      query: "arche",
    });

    expect(listMock).toHaveBeenCalledWith("other", {
      after: { title: "A", id: "1" },
      query: "arche",
    });
    expect(result).toEqual({ success: true, items: [], nextCursor: null });
  });

  it("entfernt und leert immer die Liste der Session, nie die einer übergebenen ID", async () => {
    await removeWantToPlayEntryAction("g1");
    await clearWantToPlayAction();

    expect(removeMock).toHaveBeenCalledWith("session-meeple", "g1");
    expect(clearMock).toHaveBeenCalledWith("session-meeple");
  });
});
