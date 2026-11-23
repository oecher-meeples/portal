import { beforeEach, describe, expect, it, vi } from "vitest";
import { BoardGameKind } from "@prisma/client";
import type { LudothekGame } from "@/lib/ludothek/browser";

vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({
  getSessionTier: vi.fn(),
  hasPermissionInCurrentView: vi.fn(),
}));
vi.mock("@/lib/auth/permissions", () => ({ hasPermission: vi.fn() }));
vi.mock("@/lib/ludothek/query", () => ({ buildLudothekGames: vi.fn() }));
vi.mock("@/lib/ludothek/private-collection", () => ({
  buildPrivateLudothekGames: vi.fn(),
}));
vi.mock("@/lib/ludothek/unit-contents", () => ({
  resolveUnitFilter: vi.fn(),
}));
vi.mock("@/lib/events/upcoming", () => ({ findCurrentEvent: vi.fn() }));
vi.mock("@/lib/explainer/queries", () => ({
  getAttendingExplainerBoardGameIds: vi.fn(),
}));
vi.mock("@/lib/events/guest-area", () => ({
  getPresentGameCopyIds: vi.fn(),
}));

const { getCurrentUser } = await import("@/lib/auth/server");
const { getSessionTier, hasPermissionInCurrentView } =
  await import("@/lib/auth/session");
const { hasPermission } = await import("@/lib/auth/permissions");
const { buildLudothekGames } = await import("@/lib/ludothek/query");
const { buildPrivateLudothekGames } =
  await import("@/lib/ludothek/private-collection");
const { findCurrentEvent } = await import("@/lib/events/upcoming");
const { getAttendingExplainerBoardGameIds } =
  await import("@/lib/explainer/queries");
const {
  LUDOTHEK_LIST_DESCRIPTION_MAX,
  LUDOTHEK_PAGE_SIZE,
  loadFilteredLudothekGames,
  resolveLudothekBrowseContext,
  toLudothekGamesPage,
} = await import("@/lib/ludothek/browse");

function game(overrides: Partial<LudothekGame> = {}): LudothekGame {
  return {
    id: "copy-1",
    boardGameId: "title-1",
    slug: "arche-nova",
    boardGameSlug: "arche-nova",
    title: "Arche Nova",
    imageUrl: null,
    minPlayers: 1,
    maxPlayers: 4,
    playTimeMinutes: 90,
    weight: 3.7,
    averageRating: 8.5,
    mechanics: [],
    categories: [],
    ean: null,
    condition: null,
    inventoryNumber: 7,
    bggId: null,
    alternateNames: [],
    secondaryTitle: null,
    languageDependence: null,
    ruleBookLanguages: [],
    publisher: [],
    author: [],
    illustrator: [],
    yearPublished: null,
    editionLanguages: [],
    description: null,
    explainerVideoUrl: null,
    kind: BoardGameKind.BOARDGAME,
    baseGames: [],
    expansions: [],
    zustand: "frei",
    isLoanedOut: false,
    responsibleMeepleId: null,
    responsibleName: null,
    responsibleProfilePictureUrl: null,
    responsibleProfilePictureVisibility: "INTERN",
    isUnconfirmed: false,
    unitChain: "Regal A",
    locationChain: "Regal A",
    explainerCount: 0,
    hasOpenLfg: false,
    traits: [],
    notes: null,
    isPrivate: false,
    ...overrides,
  };
}

/** `count` Titel mit je einem Exemplar. */
function titles(count: number) {
  return Array.from({ length: count }, (_, index) =>
    game({ id: `copy-${index}`, boardGameId: `title-${index}` }),
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(findCurrentEvent).mockResolvedValue(null);
  vi.mocked(buildLudothekGames).mockResolvedValue([]);
  vi.mocked(buildPrivateLudothekGames).mockResolvedValue([]);
});

describe("resolveLudothekBrowseContext (#461)", () => {
  it("treats guests as non-internal without asking for permissions", async () => {
    vi.mocked(getSessionTier).mockResolvedValue("gast");
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const context = await resolveLudothekBrowseContext({ zustand: "frei" });

    expect(context.internal).toBe(false);
    expect(context.canManageGames).toBe(false);
    // Interne Filter wirken für Gäste nicht, auch wenn sie in der URL stehen.
    expect(context.filters.zustand).toBeUndefined();
    expect(hasPermission).not.toHaveBeenCalled();
  });

  it("grants internal + manage only with both permissions", async () => {
    vi.mocked(getSessionTier).mockResolvedValue("mitglied");
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(hasPermission).mockResolvedValue(true);
    vi.mocked(hasPermissionInCurrentView).mockResolvedValue(true);

    const context = await resolveLudothekBrowseContext({ zustand: "frei" });

    expect(context.internal).toBe(true);
    expect(context.canManageGames).toBe(true);
    expect(context.filters.zustand).toBe("frei");
  });

  it("drops games:manage when ludothek:view is missing (#332)", async () => {
    vi.mocked(getSessionTier).mockResolvedValue("mitglied");
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user-1" } as never);
    vi.mocked(hasPermission).mockResolvedValue(false);
    vi.mocked(hasPermissionInCurrentView).mockResolvedValue(true);

    const context = await resolveLudothekBrowseContext({});

    expect(context.internal).toBe(false);
    expect(context.canManageGames).toBe(false);
  });
});

describe("loadFilteredLudothekGames (#461)", () => {
  it("filters the whole Bestand and loads private games only on request", async () => {
    vi.mocked(buildLudothekGames).mockResolvedValue([
      game({ id: "a", title: "Arche Nova" }),
      game({ id: "b", boardGameId: "title-2", title: "Brass" }),
    ]);

    const { allGames, filtered } = await loadFilteredLudothekGames({
      internal: true,
      filters: { search: "brass" },
      currentEvent: null,
    });

    expect(allGames).toHaveLength(2);
    expect(filtered.map((g) => g.id)).toEqual(["b"]);
    expect(buildPrivateLudothekGames).not.toHaveBeenCalled();
  });

  it("uses today's attending explainers for guests during an event (#256)", async () => {
    vi.mocked(buildLudothekGames).mockResolvedValue([
      game({ id: "a", explainerCount: 1 }),
      game({ id: "b", boardGameId: "title-2", explainerCount: 1 }),
    ]);
    vi.mocked(getAttendingExplainerBoardGameIds).mockResolvedValue(
      new Set(["title-2"]),
    );

    const { filtered } = await loadFilteredLudothekGames({
      internal: false,
      filters: { hasExplainer: true },
      currentEvent: { id: "event-1" } as never,
    });

    expect(filtered.map((g) => g.id)).toEqual(["b"]);
  });
});

describe("toLudothekGamesPage (#461)", () => {
  it("returns the first LUDOTHEK_PAGE_SIZE titles and the next offset", () => {
    const page = toLudothekGamesPage(titles(LUDOTHEK_PAGE_SIZE + 2), {
      internal: true,
      canManageGames: false,
      offset: 0,
    });

    expect(page.games).toHaveLength(LUDOTHEK_PAGE_SIZE);
    expect(page.nextOffset).toBe(LUDOTHEK_PAGE_SIZE);
  });

  it("returns the rest and nextOffset null on the last page", () => {
    const page = toLudothekGamesPage(titles(LUDOTHEK_PAGE_SIZE + 2), {
      internal: true,
      canManageGames: false,
      offset: LUDOTHEK_PAGE_SIZE,
    });

    expect(page.games).toHaveLength(2);
    expect(page.nextOffset).toBeNull();
  });

  it("strips location and person data for guests", () => {
    const [publicGame] = toLudothekGamesPage([game()], {
      internal: false,
      canManageGames: false,
      offset: 0,
    }).games;

    expect(publicGame).not.toHaveProperty("locationChain");
    expect(publicGame).not.toHaveProperty("inventoryNumber");
  });

  it("shortens long descriptions unless the viewer may edit titles", () => {
    const description = "Wort ".repeat(LUDOTHEK_LIST_DESCRIPTION_MAX);
    const long = [game({ description })];

    const [shortened] = toLudothekGamesPage(long, {
      internal: true,
      canManageGames: false,
      offset: 0,
    }).games;
    const [full] = toLudothekGamesPage(long, {
      internal: true,
      canManageGames: true,
      offset: 0,
    }).games;

    expect(shortened.description!.length).toBeLessThanOrEqual(
      LUDOTHEK_LIST_DESCRIPTION_MAX + 1,
    );
    expect(shortened.description!.endsWith("…")).toBe(true);
    expect(full.description).toBe(description);
  });
});
