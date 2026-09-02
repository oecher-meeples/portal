import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/utils/prisma";
import { encryptSecret } from "@/lib/utils/crypto";
import {
  exchangeCodeForShortLivedToken,
  getInstagramBusinessAccount,
  getLongLivedToken,
} from "@/lib/instagram/graph-client";
import { clearStateCookie, verifyState } from "@/lib/instagram/oauth-state";

const DEFAULT_EXPIRES_IN_SECONDS = 60 * 24 * 60 * 60;

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || !(await hasPermission(user.id, "instagram:connect"))) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const stateValid = verifyState(request.headers.get("cookie"), state, user.id);

  if (!code || !stateValid) {
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

  const encryptedAccessToken = encryptSecret(accessToken);

  const existing = await prisma.instagramConnection.findFirst();
  if (existing) {
    await prisma.instagramConnection.update({
      where: { id: existing.id },
      data: {
        accessToken: encryptedAccessToken,
        igBusinessAccountId,
        pageId,
        expiresAt,
      },
    });
  } else {
    await prisma.instagramConnection.create({
      data: {
        accessToken: encryptedAccessToken,
        igBusinessAccountId,
        pageId,
        expiresAt,
      },
    });
  }

  const response = NextResponse.redirect(
    new URL("/admin/einstellungen", request.url),
  );
  response.headers.append("Set-Cookie", clearStateCookie());
  return response;
}
