import { NextResponse } from "next/server";
import { runYearTurnCron } from "@/lib/members/year-turn-cron";
import { requireCronAuth } from "@/lib/utils/cron-auth";

export async function GET(request: Request) {
  const denied = requireCronAuth(request);
  if (denied) return denied;

  const summary = await runYearTurnCron();
  return NextResponse.json(summary);
}
