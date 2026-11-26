import { bggGameUrl } from "@/lib/bgg/url";
import type { ReactNode } from "react";
import { PageContainer } from "@/components/ui/page-container";
import { PageTitle } from "@/components/ui/page-title";
import { CardCornerOverlay } from "@/components/ui/card-corner-overlay";
import { BggLinkButton } from "@/components/entities/bgg-link-button";
import { BggRatingBadge } from "@/components/entities/bgg-rating-badge";
import { GameCoverMedia } from "@/components/entities/game-cover-media";
import { SharedCollectionMeeplesCard } from "@/components/feature/ludothek/shared-collection-meeples-card";
import type { SharedCollectionMeeple } from "@/lib/ludothek/shared-collection-meeples";

/**
 * Abgespeckte Detailseite für einen Katalogtitel ohne Vereins- oder
 * Privatexemplar (#637) — nur Cover, Titel, Jahr, Bewertung, BGG-Link und wer
 * den Titel spielen möchte. Vollständige Daten gibt es erst bei Besitz.
 */
export function CatalogTitleView({
  title,
  imageUrl,
  yearPublished,
  averageRating,
  bggId,
  wantToPlay,
  wantToPlayAction,
}: {
  title: string;
  imageUrl: string | null;
  yearPublished: number | null;
  averageRating: number | null;
  bggId: number | null;
  wantToPlay: SharedCollectionMeeple[];
  wantToPlayAction?: ReactNode;
}) {
  const bggUrl = bggGameUrl(bggId);
  return (
    <PageContainer className="grid grid-cols-1 gap-8 lg:grid-cols-[320px_1fr]">
      <div className="relative overflow-hidden rounded-md max-lg:mx-auto max-lg:w-fit">
        <GameCoverMedia imageUrl={imageUrl} title={title} heroResponsive />
        <CardCornerOverlay corner="top-right">
          <BggRatingBadge averageRating={averageRating} />
        </CardCornerOverlay>
      </div>
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <PageTitle size="md">{title}</PageTitle>
            {yearPublished && (
              <p className="text-muted-foreground mt-1">{yearPublished}</p>
            )}
          </div>
          {bggUrl && <BggLinkButton href={bggUrl} />}
        </div>
        <SharedCollectionMeeplesCard
          meeples={wantToPlay}
          action={wantToPlayAction}
          showWhenEmpty
          singularLabel="Meeple möchte das spielen"
          pluralLabel="Meeple möchten das spielen"
        />
      </div>
    </PageContainer>
  );
}
