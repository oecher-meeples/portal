import { describe, expect, it, vi } from "vitest";
import type { BggGameData } from "@/lib/bgg/client";
import {
  bggTagInputs,
  replaceTagsByLabel,
  resolveBggTagLabels,
  upsertTag,
} from "./tags";
import { tagLabelsByType } from "./tags-read";

type Row = { id: string; bggId: number | null; name: string };

function fakeTx(
  existing: Record<string, Row> = {},
  firstMatch: Row | null = null,
) {
  const tag = {
    findUnique: vi.fn(
      async ({ where }: { where: { dedupKey: string } }) =>
        existing[where.dedupKey] ?? null,
    ),
    findFirst: vi.fn(async () => firstMatch),
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
      }) => ({ id: where.id, ...data }),
    ),
  };
  const boardGameTag = {
    createMany: vi.fn(async () => ({ count: 0 })),
    deleteMany: vi.fn(async () => ({ count: 0 })),
  };
  return { tx: { tag, boardGameTag } as never, tag, boardGameTag };
}

describe("upsertTag", () => {
  it("creates a tag keyed by type and BGG id", async () => {
    const { tx, tag } = fakeTx();
    await upsertTag(tx, { type: "MECHANIC", bggId: 2082, name: "Card Play" });
    expect(tag.create).toHaveBeenCalledWith({
      data: {
        dedupKey: "MECHANIC:bgg:2082",
        name: "Card Play",
        normalizedName: "card play",
        bggId: 2082,
        type: "MECHANIC",
      },
    });
  });

  it("keeps the same name apart per type", async () => {
    const { tx, tag } = fakeTx({
      "MECHANIC:name:dice": { id: "m1", bggId: null, name: "Dice" },
    });
    await upsertTag(tx, { type: "CATEGORY", bggId: null, name: "Dice" });
    expect(tag.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ dedupKey: "CATEGORY:name:dice" }),
    });
  });

  it("attaches a late BGG id to the name-only tag of the same type", async () => {
    const { tx, tag } = fakeTx({
      "CATEGORY:name:animals": { id: "c1", bggId: null, name: "Animals" },
    });
    await upsertTag(tx, { type: "CATEGORY", bggId: 1015, name: "Animals" });
    expect(tag.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { bggId: 1015, dedupKey: "CATEGORY:bgg:1015", name: "Animals" },
    });
    expect(tag.create).not.toHaveBeenCalled();
  });
});

describe("upsertTag without BGG id", () => {
  it("reuses an existing tag of the same name instead of a name-only duplicate", async () => {
    const { tx, tag } = fakeTx({}, { id: "t1", bggId: 2008, name: "Trading" });
    const result = await upsertTag(tx, {
      type: "MECHANIC",
      bggId: null,
      name: "trading",
    });
    expect(result.id).toBe("t1");
    expect(tag.findFirst).toHaveBeenCalledWith({
      where: { type: "MECHANIC", normalizedName: "trading" },
      orderBy: { bggId: "asc" },
    });
    expect(tag.create).not.toHaveBeenCalled();
  });
});

describe("replaceTagsByLabel", () => {
  it("links an existing tag matched by display name or name", async () => {
    const { tx, tag, boardGameTag } = fakeTx(
      {},
      { id: "t1", bggId: 2082, name: "Card Play" },
    );
    await replaceTagsByLabel(tx, "game-1", "MECHANIC", ["Kartenspiel"]);
    expect(boardGameTag.deleteMany).toHaveBeenCalledWith({
      where: { boardGameId: "game-1", tag: { type: "MECHANIC" } },
    });
    expect(tag.create).not.toHaveBeenCalled();
    expect(boardGameTag.createMany).toHaveBeenCalledWith({
      data: [{ boardGameId: "game-1", tagId: "t1" }],
      skipDuplicates: true,
    });
  });

  it("creates a name-only tag for an unknown label", async () => {
    const { tx, tag, boardGameTag } = fakeTx();
    await replaceTagsByLabel(tx, "game-1", "MECHANIC", ["Eigenbau"]);
    expect(tag.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        dedupKey: "MECHANIC:name:eigenbau",
        bggId: null,
        name: "Eigenbau",
      }),
    });
    expect(boardGameTag.createMany).toHaveBeenCalledWith({
      data: [{ boardGameId: "game-1", tagId: "new-MECHANIC:name:eigenbau" }],
      skipDuplicates: true,
    });
  });
});

describe("bggTagInputs", () => {
  it("maps mechanic and category links to typed tag inputs", () => {
    const preview = {
      mechanicLinks: [{ bggId: 2082, name: "Card Play" }],
      categoryLinks: [{ bggId: 1015, name: "Animals" }],
    } as unknown as BggGameData;
    expect(bggTagInputs(preview)).toEqual([
      { type: "MECHANIC", bggId: 2082, name: "Card Play" },
      { type: "CATEGORY", bggId: 1015, name: "Animals" },
    ]);
    expect(bggTagInputs(null)).toEqual([]);
  });
});

describe("tagLabelsByType", () => {
  it("groups display names per type, falls back to the BGG name, sorted and deduped", () => {
    expect(
      tagLabelsByType([
        {
          tag: {
            type: "MECHANIC",
            name: "Worker Placement",
            displayName: "Arbeitereinsatz",
          },
        },
        { tag: { type: "MECHANIC", name: "Deck Building", displayName: null } },
        { tag: { type: "CATEGORY", name: "Animals", displayName: "Tiere" } },
        {
          tag: {
            type: "MECHANIC",
            name: "Worker Placement",
            displayName: "Arbeitereinsatz",
          },
        },
      ]),
    ).toEqual({
      mechanics: ["Arbeitereinsatz", "Deck Building"],
      categories: ["Tiere"],
    });
  });
});

describe("resolveBggTagLabels", () => {
  it("labels by BGG id, then by name, else keeps the BGG name — per type", async () => {
    const findMany = vi.fn(async () => [
      {
        type: "MECHANIC",
        bggId: 2082,
        name: "Card Play",
        normalizedName: "card play",
        displayName: "Kartenspiel",
      },
      {
        type: "MECHANIC",
        bggId: null,
        name: "Income",
        normalizedName: "income",
        displayName: "Einkommen",
      },
      {
        type: "MECHANIC",
        bggId: null,
        name: "Animals",
        normalizedName: "animals",
        displayName: "Falscher Typ",
      },
    ]);
    const tx = { tag: { findMany } } as never;
    const preview = {
      mechanicLinks: [
        { bggId: 2082, name: "Card Play" },
        { bggId: 2015, name: "Income" },
        { bggId: 7, name: "Unknown" },
      ],
      categoryLinks: [{ bggId: 1015, name: "Animals" }],
    } as unknown as BggGameData;

    expect(await resolveBggTagLabels(tx, preview)).toEqual({
      mechanics: ["Kartenspiel", "Einkommen", "Unknown"],
      categories: ["Animals"],
    });
  });

  it("skips the query without links", async () => {
    const findMany = vi.fn();
    const preview = {
      mechanicLinks: [],
      categoryLinks: [],
    } as unknown as BggGameData;
    expect(
      await resolveBggTagLabels({ tag: { findMany } } as never, preview),
    ).toEqual({
      mechanics: [],
      categories: [],
    });
    expect(findMany).not.toHaveBeenCalled();
  });
});
