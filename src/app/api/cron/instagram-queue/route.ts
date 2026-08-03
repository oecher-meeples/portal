import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { processQueue, refreshConnectionIfNeeded } from "@/lib/instagram/queue";
import { deleteExpiredBankDataAccessLogs } from "@/lib/members/bank-access-log";
import { anonymiseExpiredMeeples } from "@/lib/members/retention";
import { processNewsletterQueue } from "@/lib/newsletter/dispatch";

// Brevo's free tier caps at 300 mails/day; this cron runs once a day (see vercel.json).
const NEWSLETTER_DAILY_LIMIT = 300;

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
  const newsletter = await processNewsletterQueue(NEWSLETTER_DAILY_LIMIT);
  const bankLogCleanup = await deleteExpiredBankDataAccessLogs();
  // Reports `skipped: true` until the retention period is decided (see #49).
  const retention = await anonymiseExpiredMeeples();
  return NextResponse.json({
    ...summary,
    newsletter,
    bankLogCleanup,
    retention,
  });
}
