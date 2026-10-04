import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { headers } from "next/headers";
import { prisma } from "@/lib/utils/prisma";
import { requireEnv } from "@/lib/utils/require-env";
import {
  buildAuthOptions,
  createCredentialUser,
  parseTrustedOrigins,
} from "@/lib/auth/config";

/**
 * Self-hosted better-auth (docs/adr/0015) on our own Postgres, through the
 * same Prisma client as the rest of the app — no second connection pool.
 */
export const auth = betterAuth(
  buildAuthOptions({
    baseURL: requireEnv("BETTER_AUTH_URL"),
    secret: requireEnv("BETTER_AUTH_SECRET"),
    trustedOrigins: parseTrustedOrigins(
      process.env.BETTER_AUTH_TRUSTED_ORIGINS,
    ),
    database: prismaAdapter(prisma, { provider: "postgresql" }),
  }),
);

/** Invite redemption / Systemkonto: create a login without a session, see
 * `createCredentialUser` in config.ts. */
export function createLoginAccount(input: {
  email: string;
  name: string;
  password: string;
}) {
  return createCredentialUser(auth.$context, input);
}

/**
 * disableRefresh: both callers below run during Server Component render,
 * where Next.js forbids writing cookies. Refreshing the session (sliding
 * `expiresAt` forward once `updateAge` has passed) would update the DB row
 * but could not deliver the matching cookie — so render never refreshes.
 * Session refresh happens in `src/proxy.ts` (for /admin routes), where
 * cookies can be written.
 *
 * Neon Auth background (#242): Neon's SDK kept a ~5-min session-data cache
 * cookie and, on a cache miss, fetched upstream and tried to mint a new
 * cache cookie even with disableRefresh — which threw "Cookies can only be
 * modified…" during render, so this degraded to "logged out" for that
 * render (the accepted "Gast"-flicker on public pages). The self-hosted
 * setup has no cache cookie (`session.cookieCache` stays off): every call
 * is one indexed lookup in our own `auth_sessions` table, and the
 * `nextCookies()` plugin swallows cookie writes Next.js forbids instead of
 * throwing. The flicker is therefore gone, not just accepted.
 *
 * The catch below is kept deliberately as a safety net: should any
 * better-auth code path still attempt a cookie write outside nextCookies'
 * guard, a page render degrades to "logged out" instead of crashing — the
 * same contract as before. Unrelated errors (e.g. DB down) still throw.
 */
async function getSessionData() {
  try {
    return await auth.api.getSession({
      headers: await headers(),
      query: { disableRefresh: true },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Cookies can only be modified")
    ) {
      return null;
    }
    throw error;
  }
}

export async function getCurrentUser() {
  const data = await getSessionData();
  return data?.user ?? null;
}

/** Full session incl. `session.createdAt` — needed to enforce the
 * admin:access forced-relogin rule (#231). Prefer `getCurrentUser()` unless
 * the session record itself (not just the user) is actually needed. */
export async function getCurrentSession() {
  const data = await getSessionData();
  return data?.session && data?.user
    ? { session: data.session, user: data.user }
    : null;
}
