import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { createMember } = await import("./create-member");

const ADDRESS = {
  street: "Hauptstr. 1",
  postalCode: "52062",
  city: "Aachen",
};

beforeEach(() => {
  prismaMock.member.findUnique.mockResolvedValue(null);
  prismaMock.member.aggregate.mockResolvedValue({
    _max: { memberNumber: 41 },
  } as never);
  prismaMock.member.create.mockResolvedValue({ id: "member-new" } as never);
});

describe("createMember", () => {
  it("refuses a blank email for an adult (no birth date, safe default)", async () => {
    const result = await createMember({ email: "   ", ...ADDRESS });

    expect(result).toEqual({
      error: "Bitte eine E-Mail-Adresse angeben.",
    });
    expect(prismaMock.member.create).not.toHaveBeenCalled();
  });

  it("refuses an incomplete address", async () => {
    const result = await createMember({
      email: "erika@example.com",
      street: "Hauptstr. 1",
    });

    expect(result).toEqual({
      error: "Bitte eine vollständige Adresse angeben.",
    });
    expect(prismaMock.member.create).not.toHaveBeenCalled();
  });

  it("refuses a duplicate email", async () => {
    prismaMock.member.findUnique.mockResolvedValue({ id: "existing" } as never);

    const result = await createMember({
      email: "erika@example.com",
      ...ADDRESS,
    });

    expect(result).toEqual({
      error: "Für erika@example.com existiert bereits ein Vereinsmitglied.",
    });
    expect(prismaMock.member.create).not.toHaveBeenCalled();
  });

  it("assigns the next member number and creates the row", async () => {
    const result = await createMember({
      email: "Erika@Example.com",
      firstName: "Erika",
      lastName: "Musterfrau",
      ...ADDRESS,
    });

    expect(result).toEqual({ success: true, memberId: "member-new" });
    expect(prismaMock.member.create).toHaveBeenCalledWith({
      data: {
        memberNumber: 42,
        slug: "erika-musterfrau",
        email: "erika@example.com",
        firstName: "Erika",
        lastName: "Musterfrau",
        birthDate: null,
        birthPlace: null,
        street: "Hauptstr. 1",
        postalCode: "52062",
        city: "Aachen",
        phone: null,
      },
    });
  });

  it("stores an explicit joinedAt (Live-Review F1), otherwise the Prisma default applies", async () => {
    await createMember({
      email: "erika@example.com",
      joinedAt: new Date("2021-06-15"),
      ...ADDRESS,
    });

    expect(prismaMock.member.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ joinedAt: new Date("2021-06-15") }),
      }),
    );
  });

  it("falls back to a memberNumber-based slug without a name (#379)", async () => {
    await createMember({ email: "erika@example.com", ...ADDRESS });

    expect(prismaMock.member.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ slug: "mitglied-42" }),
      }),
    );
  });

  it("appends a numeric suffix when the base slug is already taken (#379)", async () => {
    prismaMock.member.findUnique.mockImplementation(((args: {
      where: Record<string, unknown>;
    }) => {
      if (args.where.slug === "erika-musterfrau") {
        return Promise.resolve({ id: "other" });
      }
      return Promise.resolve(null);
    }) as never);

    await createMember({
      email: "erika@example.com",
      firstName: "Erika",
      lastName: "Musterfrau",
      ...ADDRESS,
    });

    expect(prismaMock.member.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ slug: "erika-musterfrau-2" }),
      }),
    );
  });

  it("starts at member number 1 when no members exist yet", async () => {
    prismaMock.member.aggregate.mockResolvedValue({
      _max: { memberNumber: null },
    } as never);

    await createMember({ email: "erika@example.com", ...ADDRESS });

    expect(prismaMock.member.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ memberNumber: 1 }),
      }),
    );
  });

  describe("MiniMeeple/JungMeeple ohne eigene E-Mail (#373-Nachtrag)", () => {
    it("creates a MiniMeeple (< 13) without an email, stored as null", async () => {
      const result = await createMember({
        email: "",
        firstName: "Mini",
        lastName: "Lea",
        birthDate: new Date("2019-01-01"),
        ...ADDRESS,
      });

      expect(result).toEqual({ success: true, memberId: "member-new" });
      expect(prismaMock.member.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: null }),
        }),
      );
    });

    it("creates a JungMeeple (13–17) without an email", async () => {
      const result = await createMember({
        email: "",
        birthDate: new Date("2015-01-01"),
        ...ADDRESS,
      });

      expect(result).toEqual({ success: true, memberId: "member-new" });
    });

    it("still requires an address for a MiniMeeple", async () => {
      const result = await createMember({
        email: "",
        birthDate: new Date("2019-01-01"),
      });

      expect(result).toEqual({
        error: "Bitte eine vollständige Adresse angeben.",
      });
      expect(prismaMock.member.create).not.toHaveBeenCalled();
    });

    it("still requires an email for an 18-year-old", async () => {
      const result = await createMember({
        email: "",
        birthDate: new Date("2007-01-01"),
        ...ADDRESS,
      });

      expect(result).toEqual({
        error: "Bitte eine E-Mail-Adresse angeben.",
      });
      expect(prismaMock.member.create).not.toHaveBeenCalled();
    });
  });
});
