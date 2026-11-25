import { NextResponse } from "next/server";
import { processPrivateCollectionImportQueue } from "@/lib/ludothek/private-collection-import-queue";
import { requireCronAuth } from "@/lib/utils/cron-auth";

/** Fallback-Worker für die Import-Queue (#632): normalerweise startet
 * `after()` den Import direkt nach dem Klick; dieser Cron holt Jobs nach, die
 * durch Neustart/Absturz liegen geblieben sind. */
export async function GET(request: Request) {
  const denied = requireCronAuth(request);
  if (denied) return denied;
  return NextResponse.json(await processPrivateCollectionImportQueue());
}
