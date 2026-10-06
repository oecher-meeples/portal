import { describe, expect, it, vi } from "vitest";
import { normalizeTaxonomyName, taxonomyDedupKey } from "./normalize";
import { bggContributorInputs } from "./bgg-contributors";
import { contributorNamesByRole } from "./contributors-read";
import { linkContributors, upsertContributor } from "./contributors";
import type { BggGameData } from "@/lib/bgg/client";

describe("normalizeTaxonomyName", () => {
  it("trims, collapses whitespace and lowercases", () => {
    expect(normalizeTaxonomyName("  Klaus   Teuber ")).toBe("klaus teuber");
  });
});

describe("taxonomyDedupKey", () => {
  it("uses the BGG id when present, the normalized name otherwise", () => {
    expect(taxonomyDedupKey(11, "klaus teuber")).toBe("bgg:11");
    expect(taxonomyDedupKey(null, "klaus teuber")).toBe("name:klaus teuber");
  });

  it("prefixes the key for tags", () => {
    expect(taxonomyDedupKey(5, "x", "MECHANIC")).toBe("MECHANIC:bgg:5");
  });
});

function fakeTx(
  existing: Record<
    string,
    { id: string; bggId: number | null; name: string }
  > = {},
) {
  const contributor = {
    findUnique: vi.fn(
      async ({ where }: { where: { dedupKey: string } }) =>
        existing[where.dedupKey] ?? null,
    ),
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
      id: `new-${String(data.dedupKey)}`,
      ...data,
    })),
    update: vi.fn(
      async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => ({
        id: where.id,
        ...data,
      }),
    ),
  };
  const boardGameContributor = {
    createMany: vi.fn(async () => ({ count: 0 })),
  };
  return {
    tx: { contributor, boardGameContributor } as never,
    contributor,
    boardGameContributor,
  };
}

describe("upsertContributor", () => {
  it("creates a new contributor keyed by BGG id", async () => {
    const { tx, contributor } = fakeTx();
    await upsertContributor(tx, {
      role: "AUTHOR",
      bggId: 11,
      name: "Klaus Teuber",
    });
    expect(contributor.create).toHaveBeenCalledWith({
      data: {
        dedupKey: "bgg:11",
        name: "Klaus Teuber",
        normalizedName: "klaus teuber",
        bggId: 11,
      },
    });
  });

  it("rewrites a name-only contributor when its BGG id becomes known", async () => {
    const { tx, contributor } = fakeTx({
      "name:klaus teuber": { id: "c1", bggId: null, name: "klaus teuber" },
    });
    await upsertContributor(tx, {
      role: "AUTHOR",
      bggId: 11,
      name: "Klaus Teuber",
    });
    expect(contributor.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { bggId: 11, dedupKey: "bgg:11", name: "Klaus Teuber" },
    });
    expect(contributor.create).not.toHaveBeenCalled();
  });
});

describe("linkContributors", () => {
  it("skips duplicate role links", async () => {
    const { tx, boardGameContributor } = fakeTx({
      "bgg:11": { id: "c1", bggId: 11, name: "Klaus Teuber" },
    });
    await linkContributors(tx, "game-1", [
      { role: "AUTHOR", bggId: 11, name: "Klaus Teuber" },
    ]);
    expect(boardGameContributor.createMany).toHaveBeenCalledWith({
      data: [{ boardGameId: "game-1", contributorId: "c1", role: "AUTHOR" }],
      skipDuplicates: true,
    });
  });
});

describe("bggContributorInputs", () => {
  const preview = {
    designers: [{ bggId: 1, name: "Designer A" }],
    illustrators: [{ bggId: 3, name: "Artist C" }],
    versions: [
      {
        publisher: ["Verlag X"],
        publisherLinks: [{ bggId: 2, name: "Verlag X" }],
      },
      {
        publisher: ["Verlag Y"],
        publisherLinks: [{ bggId: 4, name: "Verlag Y" }],
      },
    ],
  } as unknown as BggGameData;

  it("uses the publisher links of the edition matching the publisher text", () => {
    expect(bggContributorInputs(preview, "Verlag Y")).toEqual([
      { role: "PUBLISHER", bggId: 4, name: "Verlag Y" },
      { role: "AUTHOR", bggId: 1, name: "Designer A" },
      { role: "ILLUSTRATOR", bggId: 3, name: "Artist C" },
    ]);
  });

  it("drops publisher links when the publisher text matches no edition", () => {
    expect(bggContributorInputs(preview, "Eigener Verlag")).toEqual([
      { role: "AUTHOR", bggId: 1, name: "Designer A" },
      { role: "ILLUSTRATOR", bggId: 3, name: "Artist C" },
    ]);
  });

  it("returns nothing without a preview", () => {
    expect(bggContributorInputs(null, "Verlag X")).toEqual([]);
  });
});

describe("contributorNamesByRole", () => {
  it("groups names per role, sorted alphabetically and without duplicates", () => {
    expect(
      contributorNamesByRole([
        { role: "PUBLISHER", contributor: { name: "Kosmos" } },
        { role: "PUBLISHER", contributor: { name: "Amigo" } },
        { role: "PUBLISHER", contributor: { name: "Kosmos" } },
        { role: "AUTHOR", contributor: { name: "Klaus Teuber" } },
        { role: "ILLUSTRATOR", contributor: { name: "Michael Menzel" } },
      ]),
    ).toEqual({
      publisher: ["Amigo", "Kosmos"],
      author: ["Klaus Teuber"],
      illustrator: ["Michael Menzel"],
    });
  });
});
