import { createNeonAuth } from "@neondatabase/auth/next/server";
import { requireEnv } from "@/lib/utils/require-env";

export const auth = createNeonAuth({
  baseUrl: requireEnv("NEON_AUTH_BASE_URL"),
  cookies: {
    secret: requireEnv("NEON_AUTH_COOKIE_SECRET"),
  },
});

export async function getCurrentUser() {
  // disableRefresh: getCurrentUser() runs during Server Component render, where
  // Next.js forbids writing cookies. auth.getSession() otherwise tries to
  // refresh/write the session cookie and throws "Cookies can only be modified…".
  // If session refresh is needed, it belongs in middleware or a Route Handler,
  // not here.
  //
  // disableRefresh only prevents session-expiry refresh, not cookie writes in
  // general: when the local session-data cache cookie is missing/stale (its
  // TTL is ~5min, and only /admin routes are covered by src/proxy.ts's
  // refresh), auth.getSession() falls through to an upstream fetch that still
  // tries to mint a fresh cache cookie — and throws the same error. Catch that
  // specific case and degrade to "logged out" for this render rather than
  // crashing the whole page; see issue for the proper fix (refresh coverage
  // for non-/admin routes too).
  try {
    const { data: session } = await auth.getSession({
      query: { disableRefresh: true },
    });
    return session?.user ?? null;
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
