import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { updateMember } = await import("./update-member");

beforeEach(() => {
  prismaMock.member.findUnique.mockResolvedValue(null);
});

describe("updateMember", () => {
  it("refuses a blank email", async () => {
    const result = await updateMember("member-1", { email: "  " });

    expect(result).toEqual({ error: "Bitte eine E-Mail-Adresse angeben." });
    expect(prismaMock.member.update).not.toHaveBeenCalled();
  });

  it("refuses an email already used by a different member", async () => {
    prismaMock.member.findUnique.mockResolvedValue({
      id: "other-member",
    } as never);

    const result = await updateMember("member-1", {
      email: "taken@example.com",
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
      street: "Hauptstr. 1",
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
        postalCode: null,
        city: null,
        phone: null,
      },
    });
  });
});
