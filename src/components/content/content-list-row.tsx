import Link from "next/link";
import type { ContentItem } from "@/lib/content";
import { PlaceholderMedia } from "@/components/shared/placeholder-media";
import { ContentTypeBadge } from "@/components/content/content-type-badge";
import { formatDate } from "@/lib/format";

export function ContentListRow({ item }: { item: ContentItem }) {
  return (
    <Link
      href={`/news/${item.slug}`}
      className="group bg-card hover:border-primary/60 flex gap-4 rounded-lg border p-4 transition-colors"
    >
      <PlaceholderMedia
        label="BILD"
        aspect="aspect-square"
        className="w-28 shrink-0 sm:w-36"
      />
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <ContentTypeBadge type={item.type} />
          <span className="bg-muted text-muted-foreground rounded px-2 py-0.5 font-mono text-xs">
            {formatDate(item.date)}
          </span>
        </div>
        <h3 className="group-hover:text-primary font-serif text-lg leading-snug font-semibold">
          {item.title}
        </h3>
        <p className="text-muted-foreground text-sm">{item.excerpt}</p>
      </div>
    </Link>
  );
}
