import { beforeEach, describe, expect, it, vi } from "vitest";

const notFoundMock = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
vi.mock("next/navigation", () => ({ notFound: () => notFoundMock() }));

const findTitleMock = vi.fn();
const findMeeplesMock = vi.fn();
vi.mock("@/lib/ludothek/shared-collection-meeples", () => ({
  findWantToPlayCatalogTitle: (...args: unknown[]) => findTitleMock(...args),
  findSharedCollectionMeeples: (...args: unknown[]) => findMeeplesMock(...args),
}));
vi.mock("@/lib/members/meeples", () => ({
  getCurrentMeeple: () => Promise.resolve({ id: "m1" }),
}));
vi.mock("@/components/feature/ludothek/catalog-title-view", () => ({
  CatalogTitleView: () => null,
}));
vi.mock("@/components/feature/ludothek/want-to-play-button", () => ({
  WantToPlayButton: () => null,
}));

const { renderCatalogTitle } = await import("./render-catalog-title");

beforeEach(() => {
  vi.clearAllMocks();
  findMeeplesMock.mockResolvedValue([]);
});

describe("renderCatalogTitle (#637)", () => {
  it("liefert Gästen 404, ohne die Datenbank zu fragen", async () => {
    await expect(renderCatalogTitle("wunschspiel", false)).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(findTitleMock).not.toHaveBeenCalled();
  });

  it("liefert 404, wenn der Titel keine Want-to-Play-Einträge hat", async () => {
    findTitleMock.mockResolvedValue(null);
    await expect(renderCatalogTitle("wunschspiel", true)).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it("rendert Eingeloggten die Katalogseite", async () => {
    findTitleMock.mockResolvedValue({ id: "g1", title: "Wunschspiel" });
    const element = await renderCatalogTitle("wunschspiel", true);
    expect(element.props).toMatchObject({ title: "Wunschspiel" });
  });
});
