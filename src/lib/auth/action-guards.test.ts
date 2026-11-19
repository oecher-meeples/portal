import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: getCurrentUserMock }));

const hasPermissionMock = vi.fn();
vi.mock("@/lib/auth/permissions", () => ({
  hasPermission: (...args: unknown[]) => hasPermissionMock(...args),
}));

class RedirectError extends Error {}
vi.mock("next/navigation", () => ({
  redirect: (target: string) => {
    throw new RedirectError(target);
  },
}));

const { actionPermissionDenied, findActionActor, requireActionPermission } =
  await import("./action-guards");

const USER = { id: "user-1", name: "Vorstand" };
const MEEPLE = { id: "meeple-1", anonymizedAt: null as Date | null };
const PAST = new Date("2025-01-01T00:00:00Z");
const FUTURE = new Date("2999-01-01T00:00:00Z");

const MEMBERS = {
  aktiv: { resignedAt: null, membershipEndsAt: null },
  gekuendigt: { resignedAt: PAST, membershipEndsAt: FUTURE },
  ausgetreten: { resignedAt: PAST, membershipEndsAt: PAST },
};

function signedIn(
  member: (typeof MEMBERS)[keyof typeof MEMBERS],
  meeple = MEEPLE,
) {
  getCurrentUserMock.mockResolvedValue(USER);
  prismaMock.meeple.upsert.mockResolvedValue(meeple as never);
  prismaMock.member.findUnique.mockResolvedValue({
    id: "member-1",
    slug: "vorstand",
    ...member,
  } as never);
}

beforeEach(() => {
  hasPermissionMock.mockReset().mockResolvedValue(true);
});

describe("requireActionPermission", () => {
  it("redirects to /login without a session", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    await expect(requireActionPermission("members:manage")).rejects.toThrow(
      "/login",
    );
  });

  it("redirects to /403 without the permission", async () => {
    signedIn(MEMBERS.aktiv);
    hasPermissionMock.mockResolvedValue(false);

    await expect(requireActionPermission("members:manage")).rejects.toThrow(
      "/403",
    );
  });

  it("lets an active member with the permission through and returns the actor", async () => {
    signedIn(MEMBERS.aktiv);

    const actor = await requireActionPermission("members:manage");

    expect(actor.user).toBe(USER);
    expect(actor.meeple).toBe(MEEPLE);
    expect(actor.membershipState).toBe("registriert");
    expect(hasPermissionMock).toHaveBeenCalledWith("user-1", "members:manage");
  });

  it("lets a gekündigt member through — the membership still runs", async () => {
    signedIn(MEMBERS.gekuendigt);

    const actor = await requireActionPermission("members:manage");

    expect(actor.membershipState).toBe("gekuendigt");
  });

  it("rejects an ausgetreten member even though a kept extra role grants the permission", async () => {
    signedIn(MEMBERS.ausgetreten);

    await expect(requireActionPermission("members:manage")).rejects.toThrow(
      "/403",
    );
  });

  it("lets an ausgetreten member through for a settlement action", async () => {
    signedIn(MEMBERS.ausgetreten);

    const actor = await requireActionPermission("ludothek:borrow", {
      settlement: true,
    });

    expect(actor.membershipState).toBe("ausgetreten");
  });

  it("rejects an anonymised account, even for a settlement action", async () => {
    signedIn(MEMBERS.aktiv, { ...MEEPLE, anonymizedAt: PAST });

    await expect(
      requireActionPermission("ludothek:borrow", { settlement: true }),
    ).rejects.toThrow("/403");
  });

  it("accepts any one of several permissions", async () => {
    signedIn(MEMBERS.aktiv);
    hasPermissionMock.mockImplementation(
      async (_userId: string, key: string) => key === "posts:internal",
    );

    const actor = await requireActionPermission([
      "posts:public",
      "posts:internal",
    ]);

    expect(actor.user).toBe(USER);
  });
});

describe("findActionActor", () => {
  it("returns null instead of redirecting", async () => {
    signedIn(MEMBERS.ausgetreten);

    expect(await findActionActor("games:manage")).toBeNull();
  });

  it("returns null without a session", async () => {
    getCurrentUserMock.mockResolvedValue(null);

    expect(await findActionActor("games:manage")).toBeNull();
  });
});

describe("actionPermissionDenied", () => {
  it("returns the error result when the guard denies", async () => {
    signedIn(MEMBERS.aktiv);
    hasPermissionMock.mockResolvedValue(false);

    expect(await actionPermissionDenied("downloads:manage")).toEqual({
      error: "Keine Berechtigung.",
    });
  });

  it("returns null when the guard allows", async () => {
    signedIn(MEMBERS.aktiv);

    expect(await actionPermissionDenied("downloads:manage")).toBeNull();
  });
});
