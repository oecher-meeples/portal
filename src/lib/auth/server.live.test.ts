import { describe, expect, it } from "vitest";

/**
 * Verifies the actual, unmocked connection to the Neon Auth backend — the
 * exact thing that broke in #242's follow-up bug (dev server 500'd on
 * sign-in after a DB reset) and that no test caught, because server.test.ts
 * mocks `@neondatabase/auth/next/server` entirely.
 *
 * It can't go through `@/lib/auth/server`'s `auth` object, though: that
 * package statically imports `next/headers`, which Vitest can't resolve
 * outside an actual Next.js build/runtime (`Cannot find module
 * ".../next/headers"` — same reason `route.ts` can't be unit-tested
 * directly). So this calls the same `sign-in/email` endpoint our sign-in
 * form ultimately hits, straight over HTTP against NEON_AUTH_BASE_URL — the
 * closest a test can get to "is the login connection itself working",
 * independent of the UI and of our own Next.js wiring.
 *
 * Needs a reachable NEON_AUTH_BASE_URL and the seeded admin account (see
 * prisma/seed.ts — SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD, defaults match the
 * seed script's fallback). Not part of the deterministic suite — run
 * explicitly: `npm run test:live`.
 */
describe("Neon Auth — live sign-in", () => {
  it("signs in with the seeded admin credentials", async () => {
    const baseUrl = process.env.NEON_AUTH_BASE_URL;
    if (!baseUrl) {
      throw new Error(
        "NEON_AUTH_BASE_URL is not set — needed to reach the real Neon Auth backend.",
      );
    }
    const email = process.env.SEED_ADMIN_EMAIL ?? "admin@jan-herwig.de";
    const password = process.env.SEED_ADMIN_PASSWORD ?? "admin";

    const response = await fetch(`${baseUrl}/sign-in/email`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        // Better Auth rejects requests without a trusted Origin (CSRF
        // protection) — mimic what the app itself sends from localhost.
        origin: "http://localhost:3002",
      },
      body: JSON.stringify({ email, password }),
    });
    const body = await response.json();

    expect(response.status, JSON.stringify(body)).toBe(200);
    expect(body.user?.email).toBe(email);
    expect(body.token).toEqual(expect.any(String));
  });
});
