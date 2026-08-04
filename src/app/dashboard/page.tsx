import { requireMember } from "@/lib/auth/session";
import { prisma } from "@/lib/utils/prisma";
import { getInternalContent } from "@/lib/content/content";
import {
  countUpcomingShiftBookings,
  summariseMemberHoldings,
} from "@/lib/members/dashboard";
import { DashboardView } from "@/components/feature/dashboard/dashboard-view";
import { formatDatePlain } from "@/lib/utils/format";

export default async function DashboardPage() {
  const { user, meeple, membershipState } = await requireMember();

  const [internalNews, holdings, units, ownOpenLfgCount, shiftBookings] =
    await Promise.all([
      getInternalContent(),
      prisma.gameHolding.findMany({
        where: { endedAt: null },
        include: { gameCopy: { include: { boardGame: { select: { title: true } } } } },
      }),
      prisma.storageUnit.findMany({
        select: { id: true, keeperMeepleId: true, retiredAt: true },
      }),
      prisma.lfgPost.count({
        where: { createdByMeepleId: meeple.id, closedAt: null },
      }),
      prisma.shiftBooking.findMany({
        where: { meepleId: meeple.id },
        select: { meepleId: true, shift: { select: { endsAt: true } } },
      }),
    ]);

  const upcomingShiftCount = countUpcomingShiftBookings(
    meeple.id,
    shiftBookings,
  );

  const gameTitleByHoldingId = new Map(
    holdings.map((h) => [h.id, h.gameCopy.boardGame.title]),
  );
  const summary = summariseMemberHoldings(meeple.id, holdings, units);

  const resignationNotice =
    membershipState === "gekuendigt" && meeple.membershipEndsAt
      ? {
          endsAt: formatDatePlain(meeple.membershipEndsAt),
          openHoldingsCount:
            summary.ownLoans.length + summary.ownUnitContents.length,
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
      resignationNotice={resignationNotice}
    />
  );
}
