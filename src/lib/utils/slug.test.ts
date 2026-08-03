import { describe, expect, it, vi } from "vitest";
import { slugify, uniqueSlug } from "@/lib/utils/slug";

describe("slugify", () => {
  it("lowercases and hyphenates spaces", () => {
    expect(slugify("Arche Nova")).toBe("arche-nova");
  });

  it("strips umlauts and other diacritics rather than transliterating them", () => {
    // Documents actual behaviour: no ä→ae transliteration happens here.
    expect(slugify("Käsekästchen")).toBe("ksekstchen");
  });

  it("strips punctuation and special characters", () => {
    expect(slugify("Codenames: Duet!")).toBe("codenames-duet");
  });

  it("collapses repeated whitespace and hyphens into one", () => {
    expect(slugify("Ticket   to -- Ride")).toBe("ticket-to-ride");
  });

  it("trims leading and trailing whitespace before slugging", () => {
    expect(slugify("  Azul  ")).toBe("azul");
  });

  it("returns an empty string for an empty or purely special-character input", () => {
    expect(slugify("")).toBe("");
    expect(slugify("!!!")).toBe("");
  });

  it("keeps digits", () => {
    expect(slugify("7 Wonders Duel 2")).toBe("7-wonders-duel-2");
  });
});

describe("uniqueSlug", () => {
  it("returns the plain slug when it is not taken", async () => {
    const isTaken = vi.fn().mockResolvedValue(false);

    expect(await uniqueSlug("Arche Nova", isTaken)).toBe("arche-nova");
    expect(isTaken).toHaveBeenCalledTimes(1);
  });

  it("appends -2 on the first collision", async () => {
    const isTaken = vi
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValue(false);

    expect(await uniqueSlug("Arche Nova", isTaken)).toBe("arche-nova-2");
  });

  it("keeps incrementing the suffix through multiple collisions", async () => {
    const isTaken = vi
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValue(false);

    expect(await uniqueSlug("Arche Nova", isTaken)).toBe("arche-nova-4");
  });

  it("checks each candidate slug in order, base first", async () => {
    const isTaken = vi
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValue(false);

    await uniqueSlug("Arche Nova", isTaken);

    expect(isTaken).toHaveBeenNthCalledWith(1, "arche-nova");
    expect(isTaken).toHaveBeenNthCalledWith(2, "arche-nova-2");
  });
});
