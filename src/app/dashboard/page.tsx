import { requireMember, hasPermissionInCurrentView } from "@/lib/auth/session";
import { prisma } from "@/lib/utils/prisma";
import { getInternalContent } from "@/lib/content/content";
import { listImportantLinks } from "@/lib/links/links";
import {
  buildResignationNotice,
  countUpcomingShiftBookings,
  summariseMemberHoldings,
} from "@/lib/members/dashboard";
import { findOpenHelperRequestEvent } from "@/lib/events/upcoming";
import { DashboardView } from "@/components/feature/dashboard/dashboard-view";
import { formatDatePlain } from "@/lib/utils/format";

export default async function DashboardPage() {
  const { user, meeple, membershipState } = await requireMember();

  const [
    member,
    internalNews,
    holdings,
    units,
    ownOpenLfgCount,
    shiftBookings,
    totalOpenLfgCount,
    activeMarketListingCount,
    importantLinks,
    openHelperRequestEvent,
  ] = await Promise.all([
    prisma.member.findUnique({
      where: { meepleId: meeple.id },
      select: { id: true, membershipEndsAt: true },
    }),
    getInternalContent(),
    prisma.gameHolding.findMany({
      where: { endedAt: null },
      include: {
        gameCopy: { include: { boardGame: { select: { title: true } } } },
      },
    }),
    prisma.storageUnit.findMany({
      select: { id: true, keeperMeepleId: true, retiredAt: true },
    }),
    prisma.lfgPost.count({
      where: { createdByMeepleId: meeple.id, closedAt: null },
    }),
    prisma.shiftBooking.findMany({
      where: { meepleId: meeple.id },
      select: { meepleId: true, shift: { select: { targetEndsAt: true } } },
    }),
    prisma.lfgPost.count({ where: { closedAt: null } }),
    prisma.marketListing.count(),
    listImportantLinks(),
    findOpenHelperRequestEvent(),
  ]);

  const canManageLinks = await hasPermissionInCurrentView(
    user.id,
    "links:manage",
  );

  const upcomingShiftCount = countUpcomingShiftBookings(
    meeple.id,
    shiftBookings,
  );

  const gameTitleByHoldingId = new Map(
    holdings.map((h) => [h.id, h.gameCopy.boardGame.title]),
  );
  const summary = summariseMemberHoldings(
    meeple.id,
    member?.id ?? null,
    holdings,
    units,
  );

  const resignationNotice = buildResignationNotice(
    membershipState,
    member?.membershipEndsAt ?? null,
    summary.ownLoans.length + summary.ownUnitContents.length,
  );
  const resignationNoticeView = resignationNotice
    ? {
        endsAt: formatDatePlain(resignationNotice.endsAt),
        openHoldingsCount: resignationNotice.openHoldingsCount,
      }
    : null;

  return (
    <DashboardView
      user={user}
      meepleId={meeple.id}
      internalNews={internalNews}
      ownLoansCount={summary.ownLoans.length}
      ownUnitContentsCount={summary.ownUnitContents.length}
      unconfirmedHandovers={summary.unconfirmedHandovers.map((h) => ({
        id: h.id,
        gameTitle: gameTitleByHoldingId.get(h.id) ?? "",
      }))}
      unconfirmedReturns={summary.unconfirmedReturns.map((h) => ({
        id: h.id,
        gameTitle: gameTitleByHoldingId.get(h.id) ?? "",
      }))}
      ownOpenLfgCount={ownOpenLfgCount}
      upcomingShiftCount={upcomingShiftCount}
      totalOpenLfgCount={totalOpenLfgCount}
      activeMarketListingCount={activeMarketListingCount}
      importantLinks={importantLinks}
      canManageLinks={canManageLinks}
      resignationNotice={resignationNoticeView}
      openHelperRequestEvent={openHelperRequestEvent}
    />
  );
}
