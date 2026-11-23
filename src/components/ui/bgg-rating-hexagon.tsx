import { Tooltip } from "@/components/ui/tooltip";

/**
 * BGGs Rating-Hexagon (#214) — fachfrei, nimmt nur bereits aufgelöste
 * Anzeigewerte entgegen. Ob überhaupt gerendert wird und welche Farbe/
 * Bedeutung anliegt, entscheidet `components/entities/bgg-rating-badge.tsx`
 * (Fachlogik aus `lib/bgg/rating-scale.ts`, hier bewusst nicht importiert —
 * `components/ui` bleibt fachlich blind).
 */
export function BggRatingHexagon({
  rating,
  hexColor,
  meaning,
  className,
}: {
  rating: number;
  hexColor: string;
  meaning: string;
  className?: string;
}) {
  return (
    <Tooltip
      content={
        <div className="flex flex-col gap-0.5">
          <p>Durchschnittliche BGG Bewertung</p>
          <p className="text-popover-foreground/70">{meaning}</p>
        </div>
      }
    >
      <div
        role="img"
        aria-label={`Durchschnittliche BGG Bewertung: ${rating.toFixed(1)}`}
        // Breite:Höhe ≈ 1.1547:1 — nur bei diesem Verhältnis ergibt der
        // 25/75%-Clip-Path unten ein *regelmäßiges* Sechseck (gleich lange
        // Kanten). Ein quadratischer Container hätte das Hexagon in die
        // Höhe gestaucht (#214-Korrektur).
        className={`flex h-10 w-[2.89rem] shrink-0 items-center justify-center text-sm font-bold text-white [clip-path:polygon(25%_0%,75%_0%,100%_50%,75%_100%,25%_100%,0%_50%)] ${className ?? ""}`}
        style={{ backgroundColor: hexColor }}
      >
        {rating.toFixed(1)}
      </div>
    </Tooltip>
  );
}
