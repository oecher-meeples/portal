import { NextResponse } from "next/server";
import { processQueue, refreshConnectionIfNeeded } from "@/lib/instagram/queue";
import { deleteExpiredBankDataAccessLogs } from "@/lib/members/bank-access-log";
import { deleteExpiredLoginLogs } from "@/lib/auth/login-log";
import { processNewsletterQueue } from "@/lib/newsletter/dispatch";
import { resetExplainerAttendance } from "@/lib/explainer/attendance-cleanup";
import { deleteOrphanedPostImages } from "@/lib/content/post-images-cleanup";
import { requireCronAuth } from "@/lib/utils/cron-auth";

// Brevo's free tier caps at 300 mails/day; this cron runs once a day (see docker/cron/crontab).
const NEWSLETTER_DAILY_LIMIT = 300;

export async function GET(request: Request) {
  const denied = requireCronAuth(request);
  if (denied) return denied;

  await refreshConnectionIfNeeded();
  const summary = await processQueue();
  const newsletter = await processNewsletterQueue(NEWSLETTER_DAILY_LIMIT);
  const bankLogCleanup = await deleteExpiredBankDataAccessLogs();
  const loginLogCleanup = await deleteExpiredLoginLogs();
  const explainerAttendanceCleanup = await resetExplainerAttendance();
  const orphanedPostImagesDeleted = await deleteOrphanedPostImages();
  return NextResponse.json({
    ...summary,
    newsletter,
    bankLogCleanup,
    loginLogCleanup,
    explainerAttendanceCleanup,
    orphanedPostImagesDeleted,
  });
}
