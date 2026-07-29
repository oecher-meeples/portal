import { NextResponse } from "next/server";
import { processQueue } from "@/lib/instagram/queue";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await processQueue();
  return NextResponse.json(summary);
}
