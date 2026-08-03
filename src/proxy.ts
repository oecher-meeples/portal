import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { PATHNAME_HEADER } from "@/lib/auth/session";

const authMiddleware = auth.middleware({ loginUrl: "/login" });

/** Routes the auth middleware itself protects; everything else stays public. */
const AUTH_PROTECTED_PREFIX = "/admin";

/**
 * Report-Only for now (see docs/adr and Security-Audit Issue 4 · F5) — a strict
 * `script-src` breaks easily under the App Router's streaming/hydration model,
 * so this ships as a monitoring step first. Enforcing it is separate follow-up
 * work once a deploy cycle's worth of reports is in.
 */
function buildCsp(nonce: string) {
  const neonAuthOrigin = new URL(
    process.env.NEON_AUTH_BASE_URL ?? "https://neon.tech",
  ).origin;

  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}' 'unsafe-inline'`,
    `img-src 'self' data: blob: https://*.public.blob.vercel-storage.com`,
    `font-src 'self'`,
    `connect-src 'self' ${neonAuthOrigin}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
  ].join("; ");
}

/**
 * Next.js's server-action client only recognises a redirect via the
 * `x-action-redirect` response header. A plain 3xx `Location` redirect —
 * which is what @neondatabase/auth's `redirect_login` branch returns — looks
 * like neither that nor a `text/x-component` RSC response, so the client
 * throws a generic "unexpected response" error (Next error code E394)
 * instead of a message the UI can show. Detect Server Action requests via
 * the `Next-Action` header and respond with a plain 401 the client can
 * surface as an actual error message.
 */
const NEXT_ACTION_HEADER = "next-action";

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(PATHNAME_HEADER, pathname);
  requestHeaders.set("x-nonce", nonce);

  if (!pathname.startsWith(AUTH_PROTECTED_PREFIX)) {
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    response.headers.set("Content-Security-Policy-Report-Only", csp);
    return response;
  }

  // Work around a @neondatabase/auth bug (0.4.2-beta, latest as of writing):
  // its middleware proxies the get-session check upstream using the
  // *original* request's HTTP method. Neon Auth's get-session endpoint only
  // accepts GET, so any POST (e.g. a Server Action submit) or HEAD request
  // is proxied as a POST/HEAD too, the upstream call fails, and a perfectly
  // valid session gets treated as logged-out. Probe with a same-URL GET
  // clone so the auth decision never depends on the caller's method.
  const sessionProbe = new NextRequest(request.url, {
    headers: request.headers,
  });
  const authResponse = await authMiddleware(sessionProbe);
  if (authResponse.status !== 200) {
    if (request.headers.has(NEXT_ACTION_HEADER)) {
      return new NextResponse(
        "Deine Sitzung ist abgelaufen. Bitte lade die Seite neu und melde dich erneut an.",
        { status: 401, headers: { "content-type": "text/plain" } },
      );
    }
    return authResponse;
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy-Report-Only", csp);
  for (const cookie of authResponse.cookies.getAll()) {
    response.cookies.set(cookie);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
