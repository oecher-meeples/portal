import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { createMember } = await import("./create-member");

beforeEach(() => {
  prismaMock.member.findUnique.mockResolvedValue(null);
  prismaMock.member.aggregate.mockResolvedValue({
    _max: { memberNumber: 41 },
  } as never);
  prismaMock.member.create.mockResolvedValue({ id: "member-new" } as never);
});

describe("createMember", () => {
  it("refuses a blank email", async () => {
    const result = await createMember({ email: "   " });

    expect(result).toEqual({
      error: "Bitte eine E-Mail-Adresse angeben.",
    });
    expect(prismaMock.member.create).not.toHaveBeenCalled();
  });

  it("refuses a duplicate email", async () => {
    prismaMock.member.findUnique.mockResolvedValue({ id: "existing" } as never);

    const result = await createMember({ email: "erika@example.com" });

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
        street: null,
        postalCode: null,
        city: null,
        phone: null,
      },
    });
  });

  it("falls back to a memberNumber-based slug without a name (#379)", async () => {
    await createMember({ email: "erika@example.com" });

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

    await createMember({ email: "erika@example.com" });

    expect(prismaMock.member.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ memberNumber: 1 }),
      }),
    );
  });
});
