import { NextResponse } from "next/server";
import { sendMarketDigest } from "@/lib/newsletter/market-digest";
import { isAuthorizedCronRequest } from "@/lib/utils/cron-auth";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get("authorization");
  if (!isAuthorizedCronRequest(authHeader, cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await sendMarketDigest();
  return NextResponse.json(summary);
}
