import { NextResponse } from "next/server";
import { sendMarketDigest } from "@/lib/newsletter/market-digest";
import { requireCronAuth } from "@/lib/utils/cron-auth";

export async function GET(request: Request) {
  const denied = requireCronAuth(request);
  if (denied) return denied;

  const summary = await sendMarketDigest();
  return NextResponse.json(summary);
}
