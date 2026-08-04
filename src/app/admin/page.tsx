import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/utils/prisma";
import { getMembershipState } from "@/lib/members/meeples";
import { isLoanHolding } from "@/lib/ludothek/holdings";
import { UNSORTIERT_CODE } from "@/lib/inventory/codes";
import { countActiveEvents } from "@/lib/members/dashboard";
import { AdminDashboardView } from "@/components/feature/admin-dashboard/admin-dashboard-view";

export default async function AdminDashboardPage() {
  await requireAdmin();

  const [
    meeples,
    openLoanHoldings,
    openInvites,
    games,
    uncheckedGames,
    events,
  ] = await Promise.all([
    prisma.meeple.findMany({
      select: { resignedAt: true, membershipEndsAt: true, anonymizedAt: true },
    }),
    prisma.gameHolding.findMany({
      where: { endedAt: null, meepleId: { not: null } },
      select: { meepleId: true, origin: true },
    }),
    prisma.invite.count({
      where: { redeemedAt: null, expiresAt: { gt: new Date() } },
    }),
    prisma.gameCopy.findMany({
      where: { status: { not: "DEINVENTARISED" } },
      select: {
        id: true,
        needsCompletenessCheck: true,
        holdings: {
          where: { endedAt: null },
          select: { unit: { select: { code: true } } },
        },
      },
    }),
    prisma.gameCopy.count({
      where: {
        status: { not: "DEINVENTARISED" },
        needsCompletenessCheck: true,
      },
    }),
    prisma.event.findMany({ select: { endsAt: true } }),
  ]);

  const activeMembers = meeples.filter(
    (m) => getMembershipState(m) === "aktiv",
  ).length;
  const openLoans = openLoanHoldings.filter((h) => isLoanHolding(h)).length;
  const unregisteredGames = games.filter(
    (g) => g.holdings[0]?.unit?.code === UNSORTIERT_CODE,
  ).length;

  return (
    <AdminDashboardView
      stats={{
        activeMembers,
        openLoans,
        openInvites,
        gamesInStock: games.length,
        unregisteredGames,
        openChecks: uncheckedGames,
        activeEvents: countActiveEvents(events),
      }}
    />
  );
}
