import Link from "next/link";
import { Share2 } from "lucide-react";
import type { ContentItem } from "@/lib/content/content";
import { CoverMedia } from "@/components/ui/cover-media";
import { ContentTypeBadge } from "@/components/entities/content-type-badge";
import { formatDate } from "@/lib/utils/format";
import { CARD_HOVER_CLASS } from "@/components/ui/card-hover";
import { cn } from "@/lib/utils/cn";

export function ContentCard({ item }: { item: ContentItem }) {
  return (
    <Link
      href={`/news/${item.slug}`}
      className={cn(
        "group bg-card flex flex-col overflow-hidden rounded-lg border",
        CARD_HOVER_CLASS,
      )}
    >
      <CoverMedia
        imageUrl={item.coverImageUrl}
        alt={item.title}
        label="BILD"
        aspect="aspect-[4/3]"
        fit="contain"
      />
      <div className="bg-card flex flex-1 flex-col gap-2 p-4">
        {/* Fixe "Fenster"-Höhe: Badge/Link/Titel-Block und Vorschau-Text
            sind `absolute` übereinander im selben Fenster gestapelt — kein
            `overflow-hidden` hier, sonst wird der Block beim Rausslides
            direkt an der Bildkante abgeschnitten (wirkt wie "unter" dem
            Bild statt davor). Stattdessen `z-10`+eigener Kartenhintergrund:
            Bei Hover slidet der Badge/Titel-Block sichtbar vor das Bild
            nach oben, der Vorschau-Text (sonst unsichtbar) slidet+faded von
            unten in den freigewordenen Platz — Bild- und Kartengröße
            bleiben konstant, kein Layout-Shift. */}
        <div className="relative h-20">
          <div className="bg-card relative z-10 -mt-[15px] -mr-[15px] -ml-[15px] flex flex-col gap-2 rounded-[10px] pt-[15px] pr-[15px] pl-[15px] transition-transform duration-300 group-hover:-translate-y-full">
            <div className="flex items-center gap-2">
              <ContentTypeBadge type={item.type} />
              {item.instagram && (
                <Share2
                  className="text-muted-foreground size-3.5"
                  aria-label="Auch auf Instagram"
                />
              )}
            </div>
            <h3 className="line-clamp-2 font-serif text-lg leading-snug font-semibold">
              {item.title}
            </h3>
          </div>
          <p className="text-muted-foreground pointer-events-none absolute inset-x-0 top-0 line-clamp-3 translate-y-full text-sm opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
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
