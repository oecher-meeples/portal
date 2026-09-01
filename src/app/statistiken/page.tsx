import { requireMember } from "@/lib/auth/session";
import { prisma } from "@/lib/utils/prisma";
import {
  mostActiveLoanWeekdays,
  mostBorrowedGames,
} from "@/lib/statistics/loan-stats";
import {
  countBoardGameTitles,
  countGameCopies,
} from "@/lib/statistics/inventory-stats";
import { StatistikenView } from "@/components/feature/statistiken/statistiken-view";

export default async function StatistikenPage() {
  await requireMember();

  const [holdings, boardGames, clubCopies, privateEntries] = await Promise.all([
    prisma.gameHolding.findMany({
      select: {
        origin: true,
        startedAt: true,
        gameCopy: { select: { boardGameId: true } },
      },
    }),
    prisma.boardGame.findMany({ select: { id: true, title: true } }),
    prisma.gameCopy.findMany({
      where: { status: "ACTIVE" },
      select: { boardGameId: true },
    }),
    prisma.privateGameCollectionEntry.findMany({
      select: { boardGameId: true },
    }),
  ]);
  // "Most borrowed" is counted per title, not per physical copy.
  const statsHoldings = holdings.map((holding) => ({
    boardGameId: holding.gameCopy.boardGameId,
    origin: holding.origin,
    startedAt: holding.startedAt,
  }));
  const clubBoardGameIds = clubCopies.map((copy) => copy.boardGameId);
  const privateBoardGameIds = privateEntries.map((entry) => entry.boardGameId);

  return (
    <StatistikenView
      mostBorrowed={mostBorrowedGames(statsHoldings, boardGames)}
      weekdays={mostActiveLoanWeekdays(statsHoldings)}
      titleCounts={countBoardGameTitles(clubBoardGameIds, privateBoardGameIds)}
      copyCounts={countGameCopies(clubCopies.length, privateEntries.length)}
    />
  );
}
