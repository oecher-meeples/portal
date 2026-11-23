import { afterEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { resolveShortId } = await import("./resolve");

const ADMIN = { canManageGames: true };
const GUEST = { canManageGames: false };

afterEach(() => {
  vi.clearAllMocks();
});

describe("resolveShortId — inv", () => {
  it("redirects a known copy to its game page with the copy preselected", async () => {
    prismaMock.gameCopy.findUnique.mockResolvedValue({
      id: "copy-1",
      boardGame: { slug: "ark-nova" },
    } as never);

    const result = await resolveShortId("inv-123", GUEST);

    expect(result).toEqual({
      kind: "redirect",
      href: "/ludothek/ark-nova/inv-123",
    });
    expect(prismaMock.gameCopy.findUnique).toHaveBeenCalledWith({
      where: { inventoryNumber: 123 },
      select: { id: true, boardGame: { select: { slug: true } } },
    });
  });

  it("accepts a full short URL", async () => {
    prismaMock.gameCopy.findUnique.mockResolvedValue({
      boardGame: { slug: "azul" },
    } as never);

    const result = await resolveShortId(
      "https://short.oecher-meeples.org/id/inv-7",
      GUEST,
    );

    expect(result).toEqual({ kind: "redirect", href: "/ludothek/azul/inv-7" });
  });

  it("sends a manager to the create dialog for an unknown number", async () => {
    prismaMock.gameCopy.findUnique.mockResolvedValue(null);

    const result = await resolveShortId("inv-123", ADMIN);

    expect(result).toEqual({ kind: "redirect", href: "/ludothek?neu=inv-123" });
  });

  it("sends everyone else to the ludothek search for an unknown number", async () => {
    prismaMock.gameCopy.findUnique.mockResolvedValue(null);

    const result = await resolveShortId("inv-123", GUEST);

    expect(result).toEqual({ kind: "redirect", href: "/ludothek?q=123" });
  });
});

describe("resolveShortId — units", () => {
  it.each(["box-0001", "shelf-0001"])(
    "redirects a known unit %s to the filtered ludothek",
    async (slug) => {
      prismaMock.storageUnit.findUnique.mockResolvedValue({
        id: "unit-1",
      } as never);

      const result = await resolveShortId(slug, GUEST);

      expect(result).toEqual({
        kind: "redirect",
        href: `/ludothek?einheit=${slug}`,
      });
    },
  );

  it("looks the unit up by its stored code", async () => {
    prismaMock.storageUnit.findUnique.mockResolvedValue(null);

    await resolveShortId("shelf-0012", GUEST);

    expect(prismaMock.storageUnit.findUnique).toHaveBeenCalledWith({
      where: { code: "OM-SHELF-0012" },
      select: { id: true },
    });
  });

  it("sends a manager to the unit create dialog for an unknown code", async () => {
    prismaMock.storageUnit.findUnique.mockResolvedValue(null);

    const result = await resolveShortId("box-0042", ADMIN);

    expect(result).toEqual({
      kind: "redirect",
      href: "/admin/einheiten?neu=box-0042",
    });
  });

  it("is not found for everyone else", async () => {
    prismaMock.storageUnit.findUnique.mockResolvedValue(null);

    const result = await resolveShortId("box-0042", GUEST);

    expect(result).toEqual({ kind: "not-found" });
  });
});

describe("resolveShortId — not found", () => {
  it.each(["xyz-1", "inv-abc", "", "meeple-abc"])(
    "returns not-found for %s without querying",
    async (raw) => {
      const result = await resolveShortId(raw, ADMIN);

      expect(result).toEqual({ kind: "not-found" });
      expect(prismaMock.gameCopy.findUnique).not.toHaveBeenCalled();
      expect(prismaMock.storageUnit.findUnique).not.toHaveBeenCalled();
    },
  );
});
