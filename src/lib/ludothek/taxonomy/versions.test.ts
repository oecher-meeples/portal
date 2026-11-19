import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";
import { versionDisplay } from "./contributors-read";
import { describeVersion } from "./version-label";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { resolveEditionId, upsertBoardGameVersion } = await import("./versions");

beforeEach(() => {
  prismaMock.contributor.findUnique.mockResolvedValue(null);
  prismaMock.contributor.findFirst.mockResolvedValue(null);
  prismaMock.contributor.create.mockImplementation((async ({
    data,
  }: {
    data: { name: string };
  }) => ({ id: `c-${data.name}`, ...data })) as never);
});

describe("upsertBoardGameVersion", () => {
  it("updates the edition with the same BGG version id instead of duplicating it", async () => {
    prismaMock.boardGameVersion.findUnique.mockResolvedValue({
      id: "v1",
    } as never);

    const result = await upsertBoardGameVersion(prismaMock, "game-1", {
      bggVersionId: 500002,
      name: "Deutsche Ausgabe",
      languages: ["German"],
      publishers: [{ bggId: 2, name: "Feuerland Spiele" }],
    });

    expect(result).toEqual({ id: "v1" });
    expect(prismaMock.boardGameVersion.create).not.toHaveBeenCalled();
    expect(prismaMock.boardGameVersion.update).toHaveBeenCalledWith({
      where: { id: "v1" },
      data: expect.objectContaining({ languages: ["German"] }),
    });
    expect(
      prismaMock.boardGameVersionPublisher.createMany,
    ).toHaveBeenCalledWith({
      data: [{ versionId: "v1", contributorId: "c-Feuerland Spiele" }],
    });
  });

  it("creates a new edition when the BGG version id is unknown", async () => {
    prismaMock.boardGameVersion.findUnique.mockResolvedValue(null);
    prismaMock.boardGameVersion.create.mockResolvedValue({ id: "v2" } as never);

    const result = await upsertBoardGameVersion(prismaMock, "game-1", {
      bggVersionId: 7,
      languages: ["English"],
      publishers: [],
    });

    expect(result).toEqual({ id: "v2" });
    expect(prismaMock.boardGameVersion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        boardGameId: "game-1",
        bggVersionId: 7,
        languages: ["English"],
      }),
      select: { id: true },
    });
    expect(
      prismaMock.boardGameVersionPublisher.createMany,
    ).not.toHaveBeenCalled();
  });

  it("reuses an identical manual edition so copies can share it", async () => {
    prismaMock.contributor.findFirst.mockResolvedValue({
      id: "c-kosmos",
      name: "Kosmos",
    } as never);
    prismaMock.boardGameVersion.findMany.mockResolvedValue([
      {
        id: "v3",
        languages: ["German"],
        publishers: [{ contributorId: "c-kosmos" }],
      },
    ] as never);

    const result = await upsertBoardGameVersion(prismaMock, "game-1", {
      languages: ["German"],
      publishers: [{ bggId: null, name: "Kosmos" }],
    });

    expect(result).toEqual({ id: "v3" });
    expect(prismaMock.boardGameVersion.create).not.toHaveBeenCalled();
  });

  it("creates a separate manual edition when the publishers differ", async () => {
    prismaMock.boardGameVersion.findMany.mockResolvedValue([
      {
        id: "v3",
        languages: ["German"],
        publishers: [{ contributorId: "other" }],
      },
    ] as never);
    prismaMock.boardGameVersion.create.mockResolvedValue({ id: "v4" } as never);

    const result = await upsertBoardGameVersion(prismaMock, "game-1", {
      languages: ["German"],
      publishers: [{ bggId: null, name: "Kosmos" }],
    });

    expect(result).toEqual({ id: "v4" });
  });
});

describe("resolveEditionId", () => {
  it("leaves the edition unchanged for undefined and clears it for null", async () => {
    expect(await resolveEditionId(prismaMock, "game-1", undefined)).toBe(
      undefined,
    );
    expect(await resolveEditionId(prismaMock, "game-1", null)).toBeNull();
  });

  it("accepts an existing edition of the same title", async () => {
    prismaMock.boardGameVersion.findFirst.mockResolvedValue({
      id: "v1",
    } as never);

    expect(
      await resolveEditionId(prismaMock, "game-1", { versionId: "v1" }),
    ).toBe("v1");
  });

  it("rejects an edition of another title", async () => {
    prismaMock.boardGameVersion.findFirst.mockResolvedValue(null);

    await expect(
      resolveEditionId(prismaMock, "game-1", { versionId: "foreign" }),
    ).rejects.toThrow("Edition gehört nicht zu diesem Titel.");
  });
});

describe("versionDisplay", () => {
  it("returns sorted publishers and the languages of the edition", () => {
    expect(
      versionDisplay({
        languages: ["English"],
        publishers: [
          { contributor: { name: "Kosmos" } },
          { contributor: { name: "Amigo" } },
        ],
      }),
    ).toEqual({
      publisher: ["Amigo", "Kosmos"],
      editionLanguages: ["English"],
    });
  });

  it("stays empty without an edition", () => {
    expect(versionDisplay(null)).toEqual({
      publisher: [],
      editionLanguages: [],
    });
  });
});

describe("describeVersion", () => {
  it("joins publishers, languages and year", () => {
    expect(
      describeVersion({
        publishers: ["Fantasy Flight Games", "Heidelberger Spieleverlag"],
        languages: ["German"],
        yearPublished: 2015,
        name: "German first edition",
      }),
    ).toBe("Fantasy Flight Games / Heidelberger Spieleverlag · German (2015)");
  });

  it("falls back to the version name, then to a placeholder", () => {
    const empty = { publishers: [], languages: [], yearPublished: null };

    expect(describeVersion({ ...empty, name: "Deutsche Ausgabe" })).toBe(
      "Deutsche Ausgabe",
    );
    expect(describeVersion({ ...empty, name: null })).toBe(
      "Edition ohne Angaben",
    );
  });
});
