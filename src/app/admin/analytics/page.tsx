import { requireAdmin } from "@/lib/auth/session";
import {
  getAnalyticsOverview,
  parseAnalyticsWindow,
} from "@/lib/analytics/queries";
import { AdminAnalyticsView } from "@/components/feature/admin-analytics/admin-analytics-view";

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ tage?: string }>;
}) {
  await requireAdmin();

  const { tage } = await searchParams;
  const overview = await getAnalyticsOverview(parseAnalyticsWindow(tage));

  return <AdminAnalyticsView overview={overview} />;
}
