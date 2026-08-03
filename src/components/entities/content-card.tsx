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
      <CoverMedia imageUrl={item.coverImageUrl} alt={item.title} label="BILD" />
      <div className="flex flex-1 flex-col gap-2 p-4">
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
        <p className="text-muted-foreground line-clamp-2 text-sm">
          {item.excerpt}
        </p>
        <p className="text-muted-foreground mt-auto pt-2 text-xs">
          {formatDate(item.date)}
        </p>
      </div>
    </Link>
  );
}
