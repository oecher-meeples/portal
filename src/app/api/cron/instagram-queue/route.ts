import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { processQueue, refreshConnectionIfNeeded } from "@/lib/instagram/queue";
import { deleteExpiredBankDataAccessLogs } from "@/lib/members/bank-access-log";

function isAuthorized(authHeader: string | null, cronSecret: string) {
  if (!authHeader) return false;
  const expected = Buffer.from(`Bearer ${cronSecret}`);
  const actual = Buffer.from(authHeader);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get("authorization");
  if (!isAuthorized(authHeader, cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await refreshConnectionIfNeeded();
  const summary = await processQueue();
  const bankLogCleanup = await deleteExpiredBankDataAccessLogs();
  return NextResponse.json({ ...summary, bankLogCleanup });
}
