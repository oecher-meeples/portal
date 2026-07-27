import Link from "next/link";
import { Share2 } from "lucide-react";
import type { ContentItem } from "@/data/content";
import { PlaceholderMedia } from "@/components/shared/placeholder-media";
import { ContentTypeBadge } from "@/components/content/content-type-badge";
import { formatDate } from "@/lib/format";

export function ContentCard({ item }: { item: ContentItem }) {
  return (
    <Link
      href={`/news/${item.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border bg-card transition-colors hover:border-primary/60"
    >
      <PlaceholderMedia label="BILD" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center gap-2">
          <ContentTypeBadge type={item.type} />
          {item.instagram && (
            <Share2 className="size-3.5 text-muted-foreground" aria-label="Auch auf Instagram" />
          )}
        </div>
        <h3 className="font-serif text-lg font-semibold leading-snug group-hover:text-primary">
          {item.title}
        </h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">{item.excerpt}</p>
        <p className="mt-auto pt-2 text-xs text-muted-foreground">{formatDate(item.date)}</p>
      </div>
    </Link>
  );
}
