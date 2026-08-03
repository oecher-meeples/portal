import { requireMember } from "@/lib/auth/session";
import { prisma } from "@/lib/utils/prisma";
import { mostActiveLoanWeekdays, mostBorrowedGames } from "@/lib/statistics/loan-stats";
import { StatistikenView } from "@/components/feature/statistiken/statistiken-view";

export default async function StatistikenPage() {
  await requireMember();

  const [holdings, boardGames] = await Promise.all([
    prisma.gameHolding.findMany({
      select: { boardGameId: true, origin: true, startedAt: true },
    }),
    prisma.boardGame.findMany({ select: { id: true, title: true } }),
  ]);

  return (
    <StatistikenView
      mostBorrowed={mostBorrowedGames(holdings, boardGames)}
      weekdays={mostActiveLoanWeekdays(holdings)}
    />
  );
}
