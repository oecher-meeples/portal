import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";

/**
 * Route Handler statt Server Component (#231, #242) — nur hier dürfen wir
 * die Session-Cookies tatsächlich löschen. `requireAdminPermission()`
 * (Server Component) redirected hierher, sobald eine `admin:access`-Session
 * ihr Alter-Limit überschritten hat, statt selbst signOut() aufzurufen.
 */
export async function GET(request: NextRequest) {
  await auth.signOut();
  const next = request.nextUrl.searchParams.get("next") ?? "/login";
  return NextResponse.redirect(new URL(next, request.url));
}
