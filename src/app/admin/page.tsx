import { requireAdmin } from "@/lib/session";
import { AdminDashboardMockView } from "@/components/feature/admin-dashboard/admin-dashboard-mock-view";

export default async function AdminDashboardPage() {
  await requireAdmin();

  return <AdminDashboardMockView />;
}
