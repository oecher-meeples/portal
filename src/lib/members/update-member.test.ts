import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { updateMember } = await import("./update-member");

const ADDRESS = {
  street: "Hauptstr. 1",
  postalCode: "52062",
  city: "Aachen",
};

beforeEach(() => {
  prismaMock.member.findUnique.mockResolvedValue(null);
});

describe("updateMember", () => {
  it("refuses a blank email for an adult (no birth date, safe default)", async () => {
    const result = await updateMember("member-1", { email: "  ", ...ADDRESS });

    expect(result).toEqual({ error: "Bitte eine E-Mail-Adresse angeben." });
    expect(prismaMock.member.update).not.toHaveBeenCalled();
  });

  it("refuses an incomplete address", async () => {
    const result = await updateMember("member-1", {
      email: "erika@example.com",
      street: "Hauptstr. 1",
    });

    expect(result).toEqual({
      error: "Bitte eine vollständige Adresse angeben.",
    });
    expect(prismaMock.member.update).not.toHaveBeenCalled();
  });

  it("refuses an email already used by a different member", async () => {
    prismaMock.member.findUnique.mockResolvedValue({
      id: "other-member",
    } as never);

    const result = await updateMember("member-1", {
      email: "taken@example.com",
      ...ADDRESS,
    });

    expect(result).toEqual({
      error:
        "Für taken@example.com existiert bereits ein anderes Vereinsmitglied.",
    });
    expect(prismaMock.member.update).not.toHaveBeenCalled();
  });

  it("allows keeping the member's own unchanged email", async () => {
    prismaMock.member.findUnique.mockResolvedValue({
      id: "member-1",
    } as never);

    const result = await updateMember("member-1", {
      email: "member@example.com",
      ...ADDRESS,
    });

    expect(result).toEqual({ success: true });
    expect(prismaMock.member.update).toHaveBeenCalled();
  });

  it("updates the personal data fields", async () => {
    await updateMember("member-1", {
      email: "Erika@Example.com",
      firstName: "Erika",
      lastName: "Musterfrau",
      birthDate: new Date("1990-01-01"),
      ...ADDRESS,
    });

    expect(prismaMock.member.update).toHaveBeenCalledWith({
      where: { id: "member-1" },
      data: {
        email: "erika@example.com",
        firstName: "Erika",
        lastName: "Musterfrau",
        birthDate: new Date("1990-01-01"),
        birthPlace: null,
        street: "Hauptstr. 1",
        postalCode: "52062",
        city: "Aachen",
        phone: null,
      },
    });
  });

  it("stores an explicit joinedAt (Live-Review F1), leaves the column untouched otherwise", async () => {
    await updateMember("member-1", {
      email: "erika@example.com",
      joinedAt: new Date("2021-06-15"),
      ...ADDRESS,
    });

    expect(prismaMock.member.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ joinedAt: new Date("2021-06-15") }),
      }),
    );

    prismaMock.member.update.mockClear();
    await updateMember("member-1", { email: "erika@example.com", ...ADDRESS });

    expect(prismaMock.member.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ joinedAt: expect.anything() }),
      }),
    );
  });

  describe("MiniMeeple/JungMeeple ohne eigene E-Mail (#373-Nachtrag)", () => {
    it("keeps a MiniMeeple (< 13) without an email, stored as null", async () => {
      const result = await updateMember("member-1", {
        email: "",
        birthDate: new Date("2019-01-01"),
        ...ADDRESS,
      });

      expect(result).toEqual({ success: true });
      expect(prismaMock.member.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: null }),
        }),
      );
    });

    it("still requires an address for a MiniMeeple", async () => {
      const result = await updateMember("member-1", {
        email: "",
        birthDate: new Date("2019-01-01"),
      });

      expect(result).toEqual({
        error: "Bitte eine vollständige Adresse angeben.",
      });
      expect(prismaMock.member.update).not.toHaveBeenCalled();
    });

    it("still requires an email for an 18-year-old", async () => {
      const result = await updateMember("member-1", {
        email: "",
        birthDate: new Date("2007-01-01"),
        ...ADDRESS,
      });

      expect(result).toEqual({
        error: "Bitte eine E-Mail-Adresse angeben.",
      });
      expect(prismaMock.member.update).not.toHaveBeenCalled();
    });
  });
});
