import { redirect } from "next/navigation";

/**
 * Test double for `@/lib/auth/action-guards` (#522). Action tests care about
 * "Actor da / kein Recht", not about the membership lookup behind it — that
 * is covered once in `action-guards.test.ts`. Usage:
 *
 *   vi.mock("@/lib/auth/action-guards", async () =>
 *     (await import("@/lib/__mocks__/action-guards")).actionGuardsFrom(
 *       (...args) => resolveActorMock(...args),
 *     ),
 *   );
 *
 * The resolver gets the guard's arguments and returns the acting identity
 * (`null`/`undefined` = denied) or rejects (e.g. a test's redirect error).
 * The identity serves as both `user` and `meeple` — action code only reads
 * `.id` and the fields a test already put on it. `member`/`membershipState`
 * may be set on it explicitly.
 */
type Identity = {
  id: string;
  member?: unknown;
  membershipState?: string;
  [key: string]: unknown;
};
type Resolver = (...args: unknown[]) => Promise<Identity | null | undefined>;

function toActor(identity: Identity) {
  return {
    user: identity,
    meeple: identity,
    member: identity.member ?? null,
    membershipState: identity.membershipState ?? "registriert",
  };
}

export function actionGuardsFrom(resolve: Resolver) {
  return {
    requireActionPermission: async (...args: unknown[]) => {
      const identity = await resolve(...args);
      if (!identity) redirect("/403");
      return toActor(identity);
    },
    findActionActor: async (...args: unknown[]) => {
      const identity = await resolve(...args);
      return identity ? toActor(identity) : null;
    },
    actionPermissionDenied: async (...args: unknown[]) =>
      (await resolve(...args)) ? null : { error: "Keine Berechtigung." },
  };
}

/**
 * Guards built on whatever the test did to `getCurrentUser`
 * (`@/lib/auth/server`) and `hasPermission` (`@/lib/auth/permissions`,
 * mocked or real over `mockPermissionKeys()`) — for tests written
 * against those primitives before #522:
 *
 *   vi.mock("@/lib/auth/action-guards", async () =>
 *     (await import("@/lib/__mocks__/action-guards")).currentUserGuards(),
 *   );
 */
export function currentUserGuards() {
  return actionGuardsFrom(async (keys) => {
    const { getCurrentUser } = await import("@/lib/auth/server");
    const { hasPermission } = await import("@/lib/auth/permissions");
    const user = (await getCurrentUser()) as Identity | null;
    if (!user) return null;
    const list = (typeof keys === "string" ? [keys] : keys) as Parameters<
      typeof hasPermission
    >[1][];
    const granted = await Promise.all(
      list.map((key) => hasPermission(user.id, key)),
    );
    return granted.some(Boolean) ? user : null;
  });
}

/**
 * Resolver for the GameHolding action tests: `games:manage` goes to the
 * games-manager stub, everything else (`ludothek:borrow`) to the acting
 * Meeple — enriched with its Member and membership state the way the real
 * guard derives them, so tests keep steering those via their prisma/state
 * mocks.
 */
export function holdingActorResolver(stubs: {
  actingMeeple: (...args: unknown[]) => Promise<Identity>;
  gamesManager: () => Promise<Identity | null>;
  findMember: (args: { where: { meepleId: string } }) => Promise<unknown>;
  membershipState: () => string;
}): Resolver {
  return async (key, ...rest) => {
    if (key === "games:manage") return stubs.gamesManager();
    const meeple = await stubs.actingMeeple(key, ...rest);
    return {
      ...meeple,
      member: await stubs.findMember({ where: { meepleId: meeple.id } }),
      membershipState: stubs.membershipState(),
    };
  };
}
