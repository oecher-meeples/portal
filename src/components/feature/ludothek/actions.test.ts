import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ludothek/browse", () => ({
  resolveLudothekBrowseContext: vi.fn(),
  loadFilteredLudothekGames: vi.fn(),
  toLudothekGamesPage: vi.fn(),
}));

const browse = await import("@/lib/ludothek/browse");
const { loadMoreLudothekGames } =
  await import("@/components/feature/ludothek/actions");

describe("loadMoreLudothekGames (#461)", () => {
  it("re-resolves permissions server-side and pages from the given offset", async () => {
    const context = {
      internal: false,
      canManageGames: false,
      filters: { search: "brass" },
      currentEvent: null,
    };
    const filtered = [{ id: "copy-1" }];
    const page = { games: [], nextOffset: null };
    vi.mocked(browse.resolveLudothekBrowseContext).mockResolvedValue(context);
    vi.mocked(browse.loadFilteredLudothekGames).mockResolvedValue({
      filtered,
    } as never);
    vi.mocked(browse.toLudothekGamesPage).mockReturnValue(page);

    await expect(loadMoreLudothekGames({ q: "brass" }, 48)).resolves.toBe(page);
    expect(browse.resolveLudothekBrowseContext).toHaveBeenCalledWith({
      q: "brass",
    });
    expect(browse.toLudothekGamesPage).toHaveBeenCalledWith(filtered, {
      ...context,
      offset: 48,
    });
  });

  it.each([-1, 1.5, Number.NaN])(
    "returns an empty last page for an invalid offset (%s)",
    async (offset) => {
      await expect(loadMoreLudothekGames({}, offset)).resolves.toEqual({
        games: [],
        nextOffset: null,
      });
    },
  );
});
