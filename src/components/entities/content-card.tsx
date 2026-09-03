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
      <div className="bg-card relative flex flex-1 flex-col gap-2 p-4">
        {/* Bei Hover wächst nur dieser Vorschau-Text — als `absolute`
            Overlay direkt über dem Bild statt in normalem Flow, damit
            Bild- und Kartengröße konstant bleiben (kein Layout-Shift im
            Grid). */}
        <p
          className="text-muted-foreground bg-card pointer-events-none absolute right-0 bottom-full left-0 line-clamp-2 p-4 text-sm opacity-0 shadow-[0_-8px_16px_-4px_rgba(0,0,0,0.15)] transition-opacity duration-300 group-hover:opacity-100"
        >
          {item.excerpt}
        </p>
        <div className="flex items-center gap-2">
          <ContentTypeBadge type={item.type} />
          {item.instagram && (
            <Share2
              className="text-muted-foreground size-3.5"
              aria-label="Auch auf Instagram"
            />
          )}
        </div>
        <h3 className="group-hover:text-primary font-serif text-lg leading-snug font-semibold">
          {item.title}
        </h3>
        <p className="text-muted-foreground mt-auto pt-2 text-xs">
          {formatDate(item.date)}
        </p>
      </div>
    </Link>
  );
}
