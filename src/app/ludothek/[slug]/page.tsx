import { renderGameDetail } from "./render-game-detail";

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return renderGameDetail(slug);
}
