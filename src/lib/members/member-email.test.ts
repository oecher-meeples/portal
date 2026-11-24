import { describe, expect, it, vi } from "vitest";
import { prismaMock, prismaTxMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { findMemberEmailConflict, syncLoginEmail } =
  await import("./member-email");

/** `member.findUnique` serves two lookups: by `email` (conflict, `null` =
 * free) and by `id` (the member's own login). */
function memberWithLogin(neonAuthUserId: string | null) {
  prismaMock.member.findUnique.mockImplementation(((args: {
    where: { id?: string };
  }) =>
    Promise.resolve(
      args.where.id
        ? { meeple: neonAuthUserId ? { neonAuthUserId } : null }
        : null,
    )) as never);
}

describe("findMemberEmailConflict (#614)", () => {
  it("is free when neither a member nor a login uses the address", async () => {
    memberWithLogin("user-1");
    prismaMock.authUser.findUnique.mockResolvedValue(null);

    await expect(
      findMemberEmailConflict("member-1", "neu@example.com"),
    ).resolves.toBeNull();
  });

  it("reports another member using the address", async () => {
    prismaMock.member.findUnique.mockResolvedValue({ id: "other" } as never);

    await expect(
      findMemberEmailConflict("member-1", "neu@example.com"),
    ).resolves.toBe(
      "Für neu@example.com existiert bereits ein anderes Vereinsmitglied.",
    );
  });

  it("reports another login using the address", async () => {
    memberWithLogin("user-1");
    prismaMock.authUser.findUnique.mockResolvedValue({ id: "user-2" } as never);

    await expect(
      findMemberEmailConflict("member-1", "neu@example.com"),
    ).resolves.toBe(
      "neu@example.com wird bereits für ein anderes Login verwendet.",
    );
  });

  it("accepts the member's own login address", async () => {
    memberWithLogin("user-1");
    prismaMock.authUser.findUnique.mockResolvedValue({ id: "user-1" } as never);

    await expect(
      findMemberEmailConflict("member-1", "alt@example.com"),
    ).resolves.toBeNull();
  });
});

describe("syncLoginEmail (#614)", () => {
  it("moves the linked login to the new address", async () => {
    memberWithLogin("user-1");

    await syncLoginEmail(prismaTxMock, "member-1", "neu@example.com");

    expect(prismaMock.authUser.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { email: "neu@example.com" },
    });
  });

  it("leaves members without a login alone", async () => {
    memberWithLogin(null);

    await syncLoginEmail(prismaTxMock, "member-1", "neu@example.com");

    expect(prismaMock.authUser.update).not.toHaveBeenCalled();
  });

  it("never clears a login address (MiniMeeple without email)", async () => {
    await syncLoginEmail(prismaTxMock, "member-1", null);

    expect(prismaMock.member.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.authUser.update).not.toHaveBeenCalled();
  });
});
