import { requireMember } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getAllContent } from "@/lib/content";
import { summariseMemberHoldings } from "@/lib/dashboard";
import { DashboardView } from "@/components/feature/dashboard/dashboard-view";

const dateFormatter = new Intl.DateTimeFormat("de-DE");

export default async function DashboardPage() {
  const { user, meeple, membershipState } = await requireMember();
  const internalNews = (await getAllContent()).filter((item) => item.internal);

  const [holdings, units, ownOpenLfgCount] = await Promise.all([
    prisma.gameHolding.findMany({
      where: { endedAt: null },
      include: { boardGame: { select: { title: true } } },
    }),
    prisma.storageUnit.findMany({
      select: { id: true, keeperMeepleId: true, retiredAt: true },
    }),
    prisma.lfgPost.count({
      where: { createdByMeepleId: meeple.id, closedAt: null },
    }),
  ]);

  const gameTitleByHoldingId = new Map(
    holdings.map((h) => [h.id, h.boardGame.title]),
  );
  const summary = summariseMemberHoldings(meeple.id, holdings, units);

  const resignationNotice =
    membershipState === "gekuendigt" && meeple.membershipEndsAt
      ? {
          endsAt: dateFormatter.format(meeple.membershipEndsAt),
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
      resignationNotice={resignationNotice}
    />
  );
}
