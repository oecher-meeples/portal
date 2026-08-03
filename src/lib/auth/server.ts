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
  const { data: session } = await auth.getSession({
    query: { disableRefresh: true },
  });
  return session?.user ?? null;
}
