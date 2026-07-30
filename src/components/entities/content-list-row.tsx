import Link from "next/link";
import { Pencil } from "lucide-react";
import type { ContentItem } from "@/lib/content/content";
import { PlaceholderMedia } from "@/components/ui/placeholder-media";
import { ContentTypeBadge } from "@/components/entities/content-type-badge";
import { StatusPill } from "@/components/ui/status-pill";
import { formatDate } from "@/lib/utils/format";

export function ContentListRow({
  item,
  canEdit,
}: {
  item: ContentItem;
  canEdit?: boolean;
}) {
  return (
    <div
      className={`group bg-card hover:border-primary/60 relative flex gap-4 rounded-lg border p-4 transition-colors ${
        item.internal ? "border-l-primary border-l-4" : ""
      }`}
    >
      <Link href={`/news/${item.slug}`} className="absolute inset-0 z-0">
        <span className="sr-only">{item.title} lesen</span>
      </Link>
      <PlaceholderMedia
        label="BILD"
        aspect="aspect-square"
        className="pointer-events-none w-28 shrink-0 sm:w-36"
      />
      <div className="pointer-events-none flex flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ContentTypeBadge type={item.type} />
            {item.internal && <StatusPill label="intern" tone="info" />}
          </div>
          <span className="bg-muted text-muted-foreground rounded px-2 py-0.5 font-mono text-xs">
            {formatDate(item.date)}
          </span>
        </div>
        <h3 className="group-hover:text-primary font-serif text-lg leading-snug font-semibold">
          {item.title}
        </h3>
        <p className="text-muted-foreground text-sm">{item.excerpt}</p>
      </div>
      {canEdit && item.id && (
        <Link
          href={`/admin/news/${item.id}/edit`}
          className="bg-background hover:bg-accent hover:text-accent-foreground relative z-10 inline-flex size-8 shrink-0 items-center justify-center self-start rounded-md border"
          aria-label="Beitrag bearbeiten"
        >
          <Pencil className="size-4" />
        </Link>
      )}
    </div>
  );
}
