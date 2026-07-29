import { NextResponse } from "next/server";
import { processQueue, refreshConnectionIfNeeded } from "@/lib/instagram/queue";
import { deleteExpiredBankDataAccessLogs } from "@/lib/bank-access-log";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await refreshConnectionIfNeeded();
  const summary = await processQueue();
  const bankLogCleanup = await deleteExpiredBankDataAccessLogs();
  return NextResponse.json({ ...summary, bankLogCleanup });
}
