import { notFound } from "next/navigation";
import { getCurrentMeeple } from "@/lib/members/meeples";
import {
  findSharedCollectionMeeples,
  findWantToPlayCatalogTitle,
} from "@/lib/ludothek/shared-collection-meeples";
import { CatalogTitleView } from "@/components/feature/ludothek/catalog-title-view";
import { WantToPlayButton } from "@/components/feature/ludothek/want-to-play-button";

/**
 * Detailseite eines Katalogtitels ohne Exemplar (#637): nur für interne
 * Betrachter und nur, solange der Titel Want-to-Play-Einträge hat — sonst 404.
 */
export async function renderCatalogTitle(slug: string, internal: boolean) {
  if (!internal) notFound();
  const title = await findWantToPlayCatalogTitle(slug);
  if (!title) notFound();

  const [wantToPlay, currentMeeple] = await Promise.all([
    findSharedCollectionMeeples(title.id, "wantToPlay"),
    getCurrentMeeple(),
  ]);
  const marked = wantToPlay.some(
    (meeple) => meeple.meepleId === currentMeeple?.id,
  );
  return (
    <CatalogTitleView
      {...title}
      wantToPlay={wantToPlay}
      wantToPlayAction={
        currentMeeple ? (
          <WantToPlayButton boardGameId={title.id} marked={marked} />
        ) : undefined
      }
    />
  );
}
