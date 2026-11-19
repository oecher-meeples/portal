import Image from "next/image";
import { PlaceholderMedia } from "@/components/ui/placeholder-media";
import { cn } from "@/lib/utils/cn";
import { isOptimizableImageUrl } from "@/lib/utils/image-hosts";

/** Von `next.config.ts` beim Build gesetzt (#521). */
const OPTIMIZED_IMAGE_ORIGINS = (
  process.env.NEXT_PUBLIC_OPTIMIZED_IMAGE_ORIGINS ?? ""
)
  .split(",")
  .filter(Boolean);

/** Kartenraster der Ludothek/des Marktplatzes: 1 / 2 / 4 Spalten. */
const DEFAULT_SIZES =
  "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw";

/**
 * Generic cover image, falling back to the placeholder when no imageUrl is set.
 * Läuft über `next/image` (#521): lazy, in passender Größe statt der
 * BGG-`__original`-Datei. Bilder von Hosts außerhalb der Optimizer-Allowlist
 * (`image-hosts.ts`) gehen `unoptimized` durch, statt mit 400 zu brechen.
 */
export function CoverMedia({
  imageUrl,
  alt,
  label,
  className,
  aspect = "aspect-video",
  fit = "cover",
  sizing = "aspect",
  sizes = DEFAULT_SIZES,
  placeholderVariant = "generic",
}: {
  imageUrl?: string | null;
  alt: string;
  label?: string;
  className?: string;
  aspect?: string;
  fit?: "cover" | "contain";
  /** "natural" keeps the image's own aspect ratio instead of forcing `aspect` (#106). */
  sizing?: "aspect" | "natural";
  /** Gerenderte Breite für `next/image` — bei fest kleinen Thumbnails
   * (`w-8`, `size-16`, …) die Pixelbreite angeben, sonst das Kartenraster. */
  sizes?: string;
  /** "logo" (#320): Vereinslogo statt generischer Platzhalter-Box, gezielt
   * für News/Blog-Übersichten (`content-card.tsx`/`content-list-row.tsx`) —
   * siehe `PlaceholderMedia`. */
  placeholderVariant?: "generic" | "logo";
}) {
  if (!imageUrl) {
    // #447: "natural" ist bislang nur für Detailseiten mit optionalem Bild
    // im Einsatz (Blog-Beitrag, Marktplatz-Lightbox) — dort ist kein Bild
    // kein Platzhalter-Fall, sondern schlicht kein Bild. Grid-Kontexte
    // (Ludothek/Marktplatz-Karten) nutzen weiterhin "aspect" und behalten
    // den Platzhalter für eine konsistente Kachel-Höhe.
    if (sizing === "natural") return null;
    return (
      <PlaceholderMedia
        label={label}
        aspect={aspect}
        className={className}
        variant={placeholderVariant}
      />
    );
  }

  const unoptimized = !isOptimizableImageUrl(imageUrl, OPTIMIZED_IMAGE_ORIGINS);

  if (sizing === "natural") {
    // Seitenverhältnis unbekannt: `width`/`height` nur als Obergrenze für den
    // Optimizer, die tatsächliche Größe kommt aus `h-auto w-auto`.
    return (
      <Image
        src={imageUrl}
        alt={alt}
        width={1600}
        height={1600}
        sizes="(min-width: 1024px) 60vw, 100vw"
        unoptimized={unoptimized}
        className={cn(
          "h-auto max-h-[70vh] w-auto max-w-full self-center rounded-md border object-contain",
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "bg-muted relative overflow-hidden rounded-md border",
        aspect,
        className,
      )}
    >
      <Image
        src={imageUrl}
        alt={alt}
        fill
        sizes={sizes}
        unoptimized={unoptimized}
        className={fit === "cover" ? "object-cover" : "object-contain"}
      />
    </div>
  );
}
