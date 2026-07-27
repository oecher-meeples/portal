import Link from "next/link";
import type { ContentItem } from "@/data/content";
import { PlaceholderMedia } from "@/components/shared/placeholder-media";
import { ContentTypeBadge } from "@/components/content/content-type-badge";
import { formatDate } from "@/lib/format";

export function ContentListRow({ item }: { item: ContentItem }) {
  return (
    <Link
      href={`/news/${item.slug}`}
      className="group flex gap-4 rounded-lg border bg-card p-4 transition-colors hover:border-primary/60"
    >
      <PlaceholderMedia label="BILD" aspect="aspect-square" className="w-28 shrink-0 sm:w-36" />
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <ContentTypeBadge type={item.type} />
          <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
            {formatDate(item.date)}
          </span>
        </div>
        <h3 className="font-serif text-lg font-semibold leading-snug group-hover:text-primary">
          {item.title}
        </h3>
        <p className="text-sm text-muted-foreground">{item.excerpt}</p>
      </div>
    </Link>
  );
}
