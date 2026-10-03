import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { PATHNAME_HEADER } from "@/lib/auth/session";

/** Routes that require a session here; everything else stays public. */
const AUTH_PROTECTED_PREFIX = "/admin";
const LOGIN_PATH = "/login";

/**
 * Report-Only for now (see docs/adr and Security-Audit Issue 4 · F5) — a strict
 * `script-src` breaks easily under the App Router's streaming/hydration model,
 * so this ships as a monitoring step first. Enforcing it is separate follow-up
 * work once a deploy cycle's worth of reports is in.
 *
 * `connect-src 'self'` is enough: the auth client talks to our own
 * `/api/auth/*` route since the move to self-hosted better-auth (ADR 0015),
 * there is no external auth origin anymore.
 */
function buildCsp(nonce: string) {
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}' 'unsafe-inline'`,
    `img-src 'self' data: blob: https://*.public.blob.vercel-storage.com`,
    `font-src 'self'`,
    `connect-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
  ].join("; ");
}

/**
 * Next.js's server-action client only recognises a redirect via the
 * `x-action-redirect` response header. A plain 3xx `Location` redirect to the
 * login page looks like neither that nor a `text/x-component` RSC response,
 * so the client throws a generic "unexpected response" error (Next error code
 * E394) instead of a message the UI can show. Detect Server Action requests
 * via the `Next-Action` header and respond with a plain 401 the client can
 * surface as an actual error message.
 */
const NEXT_ACTION_HEADER = "next-action";

/**
 * Session check + refresh for /admin routes. Proxy runs on the Node.js
 * runtime (Next 16 default), so this is a direct lookup in our own
 * `auth_sessions` table via better-auth — no upstream HTTP hop (the Neon Auth
 * SDK's GET-only get-session probe workaround is gone with it).
 *
 * Unlike `getCurrentUser()` (Server Component render, `disableRefresh`), this
 * call MAY refresh: once `updateAge` has passed, better-auth slides the
 * session's `expiresAt` forward and returns a new session cookie, which is
 * copied onto the response here — the one place for /admin requests where
 * cookies can actually be written. Public routes are deliberately not
 * covered (#242 decision: no session lookup on every anonymous page view).
 */
async function checkAdminSession(request: NextRequest) {
  const { headers: authHeaders, response: session } = await auth.api.getSession(
    {
      headers: request.headers,
      returnHeaders: true,
    },
  );
  return { session, setCookies: authHeaders.getSetCookie() };
}

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

  const { session, setCookies } = await checkAdminSession(request);
  if (!session) {
    if (request.headers.has(NEXT_ACTION_HEADER)) {
      return new NextResponse(
        "Deine Sitzung ist abgelaufen. Bitte lade die Seite neu und melde dich erneut an.",
        { status: 401, headers: { "content-type": "text/plain" } },
      );
    }
    const redirect = NextResponse.redirect(new URL(LOGIN_PATH, request.url));
    // e.g. the deletion of an expired/invalid session cookie
    for (const cookie of setCookies) {
      redirect.headers.append("set-cookie", cookie);
    }
    return redirect;
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy-Report-Only", csp);
  for (const cookie of setCookies) {
    response.headers.append("set-cookie", cookie);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
