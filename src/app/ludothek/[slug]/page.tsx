import { notFound } from "next/navigation";
import { requireMember } from "@/lib/session";
import { GAMES, getGameBySlug } from "@/data/games";
import { GameDetailMockView } from "@/components/feature/ludothek/game-detail-mock-view";

export function generateStaticParams() {
  return GAMES.map((game) => ({ slug: game.slug }));
}

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireMember();
  const { slug } = await params;
  const game = getGameBySlug(slug);
  if (!game) notFound();

  return <GameDetailMockView game={game} />;
}
