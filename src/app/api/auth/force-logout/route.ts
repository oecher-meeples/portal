import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";

/**
 * Route Handler statt Server Component (#231, #242) — nur hier dürfen wir
 * die Session-Cookies tatsächlich löschen. `requireAdminPermission()`
 * (Server Component) redirected hierher, sobald eine `admin:access`-Session
 * ihr Alter-Limit überschritten hat, statt selbst signOut() aufzurufen.
 *
 * Die Lösch-Cookies aus better-auths Antwort werden explizit auf den
 * Redirect übertragen, statt sich darauf zu verlassen, dass Next die über
 * `nextCookies()` gesetzten `cookies()` in eine selbst gebaute Response
 * übernimmt.
 */
export async function GET(request: NextRequest) {
  const { headers: authHeaders } = await auth.api.signOut({
    headers: request.headers,
    returnHeaders: true,
  });
  const next = request.nextUrl.searchParams.get("next") ?? "/login";
  const response = NextResponse.redirect(new URL(next, request.url));
  for (const cookie of authHeaders.getSetCookie()) {
    response.headers.append("set-cookie", cookie);
  }
  return response;
}
