import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth/server";
import { PATHNAME_HEADER } from "@/lib/session";

const authMiddleware = auth.middleware({ loginUrl: "/login" });

/** Routes the auth middleware itself protects; everything else stays public. */
const AUTH_PROTECTED_PREFIX = "/admin";

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
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(PATHNAME_HEADER, pathname);

  if (!pathname.startsWith(AUTH_PROTECTED_PREFIX)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const authResponse = await authMiddleware(request);
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
  for (const cookie of authResponse.cookies.getAll()) {
    response.cookies.set(cookie);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
