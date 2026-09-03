import { PlaceholderMedia } from "@/components/ui/placeholder-media";
import { cn } from "@/lib/utils/cn";

/** Generic cover image, falling back to the placeholder when no imageUrl is set. */
export function CoverMedia({
  imageUrl,
  alt,
  label,
  className,
  aspect = "aspect-video",
  fit = "cover",
  sizing = "aspect",
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

  if (sizing === "natural") {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- covers come from arbitrary external URLs, not next/image-optimizable local assets
      <img
        src={imageUrl}
        alt={alt}
        className={cn(
          "max-h-[70vh] w-auto max-w-full self-center rounded-md border object-contain",
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "bg-muted overflow-hidden rounded-md border",
        aspect,
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- covers come from arbitrary external URLs, not next/image-optimizable local assets */}
      <img
        src={imageUrl}
        alt={alt}
        className={cn(
          "size-full",
          fit === "cover" ? "object-cover" : "object-contain",
        )}
      />
    </div>
  );
}
