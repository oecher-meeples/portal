import { CoverMedia } from "@/components/ui/cover-media";
import { cn } from "@/lib/utils/cn";

/** Game cover image, falling back to the placeholder when no imageUrl is set. */
export function GameCoverMedia({
  imageUrl,
  title,
  className,
  aspect = "aspect-[3/4]",
  heroResponsive = false,
}: {
  imageUrl: string | null;
  title: string;
  className?: string;
  aspect?: string;
  /** (#467) Spieledetailseite-Hero: unterhalb `lg` bestimmt das Bild selbst
   * seine Höhe (max. 40vh) statt einer festen `aspect`-Box — bei
   * abweichendem Seitenverhältnis (z. B. Querformat) entsteht so kein
   * Leerraum mehr oben/unten. Ab `lg` (zweispaltiges Grid) bleibt die feste
   * `aspect`-Box unverändert. Rendert dafür zwei `CoverMedia`, von denen je
   * Breakpoint nur eine sichtbar ist — Grid-Kachel-Nutzungen (`aspect`
   * ohne dieses Prop) bleiben komplett unverändert. Ohne Bild in beiden
   * Fällen dieselbe Platzhalter-Box wie bisher. */
  heroResponsive?: boolean;
}) {
  if (heroResponsive && imageUrl) {
    return (
      <>
        <CoverMedia
          imageUrl={imageUrl}
          alt={title}
          sizing="natural"
          fit="contain"
          className={cn("max-h-[40vh] lg:hidden", className)}
        />
        <CoverMedia
          imageUrl={imageUrl}
          alt={title}
          label="COVER"
          aspect={aspect}
          fit="contain"
          className={cn("hidden lg:block", className)}
        />
      </>
    );
  }

  return (
    <CoverMedia
      imageUrl={imageUrl}
      alt={title}
      label="COVER"
      aspect={aspect}
      className={className}
      fit="contain"
    />
  );
}
