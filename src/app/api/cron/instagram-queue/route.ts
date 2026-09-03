import { NextResponse } from "next/server";
import { processQueue, refreshConnectionIfNeeded } from "@/lib/instagram/queue";
import { deleteExpiredBankDataAccessLogs } from "@/lib/members/bank-access-log";
import { deleteExpiredLoginLogs } from "@/lib/auth/login-log";
import { processNewsletterQueue } from "@/lib/newsletter/dispatch";
import { isAuthorizedCronRequest } from "@/lib/utils/cron-auth";

// Brevo's free tier caps at 300 mails/day; this cron runs once a day (see vercel.json).
const NEWSLETTER_DAILY_LIMIT = 300;

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

  await refreshConnectionIfNeeded();
  const summary = await processQueue();
  const newsletter = await processNewsletterQueue(NEWSLETTER_DAILY_LIMIT);
  const bankLogCleanup = await deleteExpiredBankDataAccessLogs();
  const loginLogCleanup = await deleteExpiredLoginLogs();
  return NextResponse.json({
    ...summary,
    newsletter,
    bankLogCleanup,
    loginLogCleanup,
  });
}
