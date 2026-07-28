import { requireAdmin } from "@/lib/session";
import { FLEA_MARKET_ITEMS, FLEA_MARKET_STATS } from "@/data/bringbuy";
import { AdminBringBuyMockView } from "@/components/feature/admin-bringbuy/admin-bringbuy-mock-view";

export default async function AdminBringBuyPage() {
  await requireAdmin();

  return (
    <AdminBringBuyMockView stats={FLEA_MARKET_STATS} items={FLEA_MARKET_ITEMS} />
  );
}
