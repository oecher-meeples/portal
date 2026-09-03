import Link from "next/link";
import { Share2 } from "lucide-react";
import type { ContentItem } from "@/lib/content/content";
import { CoverMedia } from "@/components/ui/cover-media";
import { ContentTypeBadge } from "@/components/entities/content-type-badge";
import { formatDate } from "@/lib/utils/format";

export function ContentCard({ item }: { item: ContentItem }) {
  return (
    <Link
      href={`/news/${item.slug}`}
      className="group bg-card hover:border-primary/60 flex flex-col overflow-hidden rounded-lg border transition-colors"
    >
      <CoverMedia
        imageUrl={item.coverImageUrl}
        alt={item.title}
        label="BILD"
        aspect="aspect-[4/3]"
        fit="contain"
      />
      <div className="bg-card flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center gap-2">
          <ContentTypeBadge type={item.type} />
          {item.instagram && (
            <Share2
              className="text-muted-foreground size-3.5"
              aria-label="Auch auf Instagram"
            />
          )}
        </div>
        {/* Fixe "Slot"-Höhe für Titel/Vorschau-Text: beide sind `absolute`
            übereinander gestapelt, damit Bild- und Kartengröße konstant
            bleiben (kein Layout-Shift im Grid). Bei Hover slidet der Titel
            aus dem Slot nach oben (über das Bild), der Vorschau-Text slidet
            von unten in genau diesen freigewordenen Platz hinein. */}
        <div className="relative h-14">
          <h3
            className="bg-card group-hover:text-primary absolute inset-x-0 top-0 line-clamp-2 font-serif text-lg leading-snug font-semibold transition-transform duration-300 group-hover:-translate-y-full"
          >
            {item.title}
          </h3>
          <p className="text-muted-foreground pointer-events-none absolute inset-x-0 top-0 line-clamp-2 translate-y-full text-sm opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            {item.excerpt}
          </p>
        </div>
        <p className="text-muted-foreground mt-auto pt-2 text-xs">
          {formatDate(item.date)}
        </p>
      </div>
    </Link>
  );
}
