import { BggRatingHexagon } from "@/components/ui/bgg-rating-hexagon";
import { resolveRatingScale } from "@/lib/bgg/rating-scale";

/**
 * Rendert nichts ohne Rating oder außerhalb der 1–10-Skala (z. B. `0` bei
 * einem Titel ohne Bewertungen), sonst das Hexagon mit Farbe/Bedeutung aus
 * `lib/bgg/rating-scale.ts` (#214).
 */
export function BggRatingBadge({
  averageRating,
  className,
}: {
  averageRating: number | null;
  className?: string;
}) {
  const scale = resolveRatingScale(averageRating);
  if (!scale || averageRating === null) return null;

  return (
    <BggRatingHexagon
      rating={averageRating}
      hexColor={scale.hex}
      meaning={scale.meaning}
      className={className}
    />
  );
}
