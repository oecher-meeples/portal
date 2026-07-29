import { NextResponse } from "next/server";
import { processQueue, refreshConnectionIfNeeded } from "@/lib/instagram/queue";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await refreshConnectionIfNeeded();
  const summary = await processQueue();
  return NextResponse.json(summary);
}
