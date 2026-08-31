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
