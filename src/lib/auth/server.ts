import { createNeonAuth } from "@neondatabase/auth/next/server";
import { requireEnv } from "@/lib/utils/require-env";

export const auth = createNeonAuth({
  baseUrl: requireEnv("NEON_AUTH_BASE_URL"),
  cookies: {
    secret: requireEnv("NEON_AUTH_COOKIE_SECRET"),
  },
});

/**
 * disableRefresh: both callers below run during Server Component render,
 * where Next.js forbids writing cookies. auth.getSession() otherwise tries to
 * refresh/write the session cookie and throws "Cookies can only be modified…".
 * If session refresh is needed, it belongs in middleware or a Route Handler,
 * not here.
 *
 * disableRefresh only prevents session-expiry refresh, not cookie writes in
 * general: when the local session-data cache cookie is missing/stale (its
 * TTL is ~5min, and only /admin routes are covered by src/proxy.ts's
 * refresh), auth.getSession() falls through to an upstream fetch that still
 * tries to mint a fresh cache cookie — and throws the same error. Catch that
 * specific case and degrade to "logged out" for this render rather than
 * crashing the whole page.
 *
 * Decision (#242, needs-refinement): this degrade-to-"logged out" flicker
 * on non-/admin routes (an already-logged-in member briefly renders as
 * "Gast" on public pages roughly every ~5min, until the cache cookie is
 * next minted) is accepted deliberately, not fixed by widening
 * `src/proxy.ts`'s session refresh to every route. That would trade a
 * rare, harmless render-glitch for an upstream get-session call on *every*
 * page view from *every* visitor, including anonymous ones — the
 * Middleware/Route-Handler-cookie-write constraint means the refresh can
 * only happen there, not here. For this site's size, that permanent
 * latency/request-volume cost outweighs the flicker it would remove.
 * Revisit if the flicker turns out more visible in practice than expected.
 */
async function getSessionData() {
  try {
    const { data } = await auth.getSession({
      query: { disableRefresh: true },
    });
    return data ?? null;
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
