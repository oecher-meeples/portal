import { requireMember } from "@/lib/session";
import { getAllContent } from "@/lib/content";
import { DashboardView } from "@/components/feature/dashboard/dashboard-view";

export default async function DashboardPage() {
  const { user } = await requireMember();
  const internalNews = (await getAllContent()).filter((item) => item.internal);

  return <DashboardView user={user} internalNews={internalNews} />;
}
