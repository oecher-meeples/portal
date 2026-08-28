import { afterEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const {
  buildPrivateLudothekGames,
  canForceImport,
  getImportCooldownEndsAt,
  getOwnPrivateCollection,
} = await import("./private-collection");

function entry(
  overrides: Partial<{
    id: string;
    title: string;
    meepleId: string;
    meeple: { id: string; displayName: string };
  }> = {},
) {
  const {
    title = "Dune: Imperium",
    meepleId = "meeple-1",
    meeple = { id: "meeple-1", displayName: "Lea Demo" },
    ...rest
  } = overrides;

  return {
    id: "entry-1",
    meepleId,
    meeple,
    boardGame: {
      id: "bg-1",
      slug: "dune-imperium",
      title,
      imageUrl: null,
      minPlayers: 1,
      maxPlayers: 4,
      playTimeMinutes: 60,
      weight: null,
      averageRating: null,
      mechanics: [],
      bggId: 316554,
      alternateNames: [],
      secondaryTitle: null,
      description: null,
      explainerVideoUrl: null,
      kind: "BOARDGAME",
      languageDependence: null,
      publisher: [],
      author: [],
      yearPublished: null,
    },
    ...rest,
  };
}

describe("buildPrivateLudothekGames (#255-Folge)", () => {
  it("shapes an entry as a full LudothekGame row, zustand 'privat'", async () => {
    prismaMock.privateGameCollectionEntry.findMany.mockResolvedValue([
      entry(),
    ] as never);

    const [game] = await buildPrivateLudothekGames();

    expect(game).toMatchObject({
      id: "entry-1",
      boardGameId: "bg-1",
      boardGameSlug: "dune-imperium",
      title: "Dune: Imperium",
      zustand: "privat",
      isPrivate: true,
      isLoanedOut: false,
      responsibleMeepleId: "meeple-1",
      responsibleName: "Lea Demo",
      locationChain: "bei Lea Demo (privat)",
    });
  });

  it("only queries entries whose meeple has released visibility", async () => {
    prismaMock.privateGameCollectionEntry.findMany.mockResolvedValue([]);

    await buildPrivateLudothekGames();

    expect(prismaMock.privateGameCollectionEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          meeple: { privateCollectionVisible: true },
        }),
      }),
    );
  });

  it("excludes titles that already have an active club copy", async () => {
    prismaMock.privateGameCollectionEntry.findMany.mockResolvedValue([]);

    await buildPrivateLudothekGames();

    expect(prismaMock.privateGameCollectionEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          boardGame: {
            copies: { none: { status: { not: "DEINVENTARISED" } } },
          },
        }),
      }),
    );
  });
});

describe("getOwnPrivateCollection (#255-Folge, #310)", () => {
  it("returns the private fields plus the boardGame relation for title/image/slug", async () => {
    prismaMock.privateGameCollectionEntry.findMany.mockResolvedValue([
      {
        id: "entry-1",
        rating: 8.5,
        forTrade: true,
        wantToPlay: false,
        boardGame: { slug: "ark-nova", title: "Ark Nova", imageUrl: null },
      },
    ] as never);

    const result = await getOwnPrivateCollection("meeple-1");

    expect(result).toEqual([
      {
        id: "entry-1",
        rating: 8.5,
        forTrade: true,
        wantToPlay: false,
        boardGame: { slug: "ark-nova", title: "Ark Nova", imageUrl: null },
      },
    ]);
    expect(prismaMock.privateGameCollectionEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          boardGame: {
            select: { slug: true, title: true, imageUrl: true },
          },
        }),
      }),
    );
  });
});

describe("getImportCooldownEndsAt (#255-Folge)", () => {
  it("allows importing when never synced before", async () => {
    const result = await getImportCooldownEndsAt({
      privateCollectionSyncedAt: null,
      neonAuthUserId: "user-1",
    });

    expect(result).toBeNull();
  });

  it("blocks importing within the 1h window", async () => {
    prismaMock.role.count.mockResolvedValue(0);

    const result = await getImportCooldownEndsAt({
      privateCollectionSyncedAt: new Date(Date.now() - 10 * 60 * 1000),
      neonAuthUserId: "user-1",
    });

    expect(result).toBeInstanceOf(Date);
    expect(result!.getTime()).toBeGreaterThan(Date.now());
  });

  it("allows importing once the 1h window has passed", async () => {
    prismaMock.role.count.mockResolvedValue(0);

    const result = await getImportCooldownEndsAt({
      privateCollectionSyncedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      neonAuthUserId: "user-1",
    });

    expect(result).toBeNull();
  });

  it("exempts a sysadmin from the cooldown", async () => {
    prismaMock.role.count.mockResolvedValue(1);

    const result = await getImportCooldownEndsAt({
      privateCollectionSyncedAt: new Date(Date.now() - 10 * 60 * 1000),
      neonAuthUserId: "user-1",
    });

    expect(prismaMock.role.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ name: "sysadmin" }),
      }),
    );
    expect(result).toBeNull();
  });

  it("treats a meeple with no login account as never exempt", async () => {
    const result = await getImportCooldownEndsAt({
      privateCollectionSyncedAt: new Date(Date.now() - 10 * 60 * 1000),
      neonAuthUserId: null,
    });

    expect(prismaMock.role.count).not.toHaveBeenCalled();
    expect(result).toBeInstanceOf(Date);
  });
});

describe("canForceImport (#255-Folge, '!'-Button)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows anyone outside production (dev/test)", async () => {
    vi.stubEnv("NODE_ENV", "development");
    prismaMock.role.count.mockResolvedValue(0);

    expect(await canForceImport("user-1")).toBe(true);
    expect(prismaMock.role.count).not.toHaveBeenCalled();
  });

  it("in production, only allows sysadmin", async () => {
    vi.stubEnv("NODE_ENV", "production");
    prismaMock.role.count.mockResolvedValue(0);

    expect(await canForceImport("user-1")).toBe(false);
  });

  it("in production, allows sysadmin", async () => {
    vi.stubEnv("NODE_ENV", "production");
    prismaMock.role.count.mockResolvedValue(1);

    expect(await canForceImport("user-1")).toBe(true);
  });
});
