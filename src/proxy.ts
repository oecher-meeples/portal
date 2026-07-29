import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth/server";
import { PATHNAME_HEADER } from "@/lib/session";

const authMiddleware = auth.middleware({ loginUrl: "/login" });

/** Routes the auth middleware itself protects; everything else stays public. */
const AUTH_PROTECTED_PREFIX = "/admin";

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(PATHNAME_HEADER, pathname);

  if (!pathname.startsWith(AUTH_PROTECTED_PREFIX)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const authResponse = await authMiddleware(request);
  if (authResponse.status !== 200) {
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
