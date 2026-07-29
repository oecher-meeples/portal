import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  exchangeCodeForShortLivedToken,
  getInstagramBusinessAccount,
  getLongLivedToken,
} from "@/lib/instagram/graph-client";
import {
  clearStateCookie,
  readStateFromCookieHeader,
} from "@/lib/instagram/oauth-state";

const DEFAULT_EXPIRES_IN_SECONDS = 60 * 24 * 60 * 60;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = readStateFromCookieHeader(
    request.headers.get("cookie"),
  );

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.json(
      { error: "Ungültiger oder fehlender state-Parameter." },
      { status: 400 },
    );
  }

  const { accessToken: shortLivedToken } =
    await exchangeCodeForShortLivedToken(code);
  const { accessToken, expiresInSeconds } =
    await getLongLivedToken(shortLivedToken);
  const { pageId, igBusinessAccountId } =
    await getInstagramBusinessAccount(accessToken);
  const expiresAt = new Date(
    Date.now() + (expiresInSeconds ?? DEFAULT_EXPIRES_IN_SECONDS) * 1000,
  );

  const existing = await prisma.instagramConnection.findFirst();
  if (existing) {
    await prisma.instagramConnection.update({
      where: { id: existing.id },
      data: { accessToken, igBusinessAccountId, pageId, expiresAt },
    });
  } else {
    await prisma.instagramConnection.create({
      data: { accessToken, igBusinessAccountId, pageId, expiresAt },
    });
  }

  const response = NextResponse.redirect(
    new URL("/admin/einstellungen/instagram", request.url),
  );
  response.headers.append("Set-Cookie", clearStateCookie());
  return response;
}
