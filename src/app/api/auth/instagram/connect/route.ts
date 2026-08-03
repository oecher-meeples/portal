import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { hasPermission } from "@/lib/auth/permissions";
import { buildStateCookie, generateState } from "@/lib/instagram/oauth-state";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !(await hasPermission(user.id, "instagram:connect"))) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const state = generateState();
  const graphApiVersion = process.env.META_GRAPH_API_VERSION ?? "v21.0";
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID ?? "",
    redirect_uri: process.env.META_REDIRECT_URI ?? "",
    state,
    scope: "instagram_basic,instagram_content_publish,pages_show_list",
    response_type: "code",
  });

  const response = NextResponse.redirect(
    `https://www.facebook.com/${graphApiVersion}/dialog/oauth?${params}`,
  );
  response.headers.append("Set-Cookie", buildStateCookie(user.id, state));
  return response;
}
