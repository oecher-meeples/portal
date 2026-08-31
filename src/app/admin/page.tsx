import { requireAdminPermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { ADMIN_PERMISSIONS } from "@/lib/utils/nav-config";
import { prisma } from "@/lib/utils/prisma";
import { getMembershipState } from "@/lib/members/meeples";
import { isLoanHolding } from "@/lib/ludothek/holdings";
import { UNSORTIERT_CODE } from "@/lib/inventory/codes";
import { countActiveEvents } from "@/lib/members/dashboard";
import { getBlobStorageUsage } from "@/lib/admin/blob-storage";
import { getRateLimitAlerts } from "@/lib/auth/rate-limit-alerts";
import { getRecentAdminLogins } from "@/lib/auth/login-log";
import { AdminDashboardView } from "@/components/feature/admin-dashboard/admin-dashboard-view";

export default async function AdminDashboardPage() {
  const session = await requireAdminPermission([...ADMIN_PERMISSIONS]);
  // Login-Historie ist sensibel (IP/User-Agent privilegierter Konten) — nur
  // für admin:access selbst einsehbar, nicht für jede andere Admin-Permission
  // (#231).
  const canViewLoginHistory = await hasPermission(
    session.user.id,
    "admin:access",
  );

  const [
    meeples,
    openLoanHoldings,
    openInvites,
    games,
    uncheckedGames,
    events,
    blobStorageUsage,
    rateLimitAlerts,
    recentAdminLogins,
  ] = await Promise.all([
    prisma.meeple.findMany({
      select: {
        id: true,
        anonymizedAt: true,
        member: { select: { resignedAt: true, membershipEndsAt: true } },
      },
    }),
    prisma.gameHolding.findMany({
      where: { endedAt: null, vereinsmitgliedId: { not: null } },
      select: { vereinsmitgliedId: true, origin: true },
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
    // On-demand, uncached — see #224. Failure (missing token, Vercel API
    // hiccup) must not break the rest of the admin dashboard, so it degrades
    // to `null` and the card simply doesn't render (see AdminDashboardView).
    getBlobStorageUsage().catch(() => null),
    getRateLimitAlerts(),
    canViewLoginHistory ? getRecentAdminLogins() : Promise.resolve([]),
  ]);

  const activeMembers = meeples.filter(
    (m) =>
      getMembershipState({
        meepleId: m.id,
        resignedAt: m.member?.resignedAt ?? null,
        membershipEndsAt: m.member?.membershipEndsAt ?? null,
        anonymizedAt: m.anonymizedAt,
      }) === "registriert",
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
      blobStorageUsage={blobStorageUsage}
      rateLimitAlerts={rateLimitAlerts}
      recentAdminLogins={canViewLoginHistory ? recentAdminLogins : null}
    />
  );
}
