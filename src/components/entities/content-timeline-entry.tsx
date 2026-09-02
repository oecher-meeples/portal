import Link from "next/link";
import { Pencil } from "lucide-react";
import type { ContentItem } from "@/lib/content/content";
import { CoverMedia } from "@/components/ui/cover-media";
import { ContentTypeBadge } from "@/components/entities/content-type-badge";
import { InternalOnlyBadge } from "@/components/entities/internal-only-badge";
import { Button } from "@/components/ui/button";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

/** Full-view timeline entry — cover, metadata and the complete markdown body,
 * for the `/news` Vollansicht toggle (#135). Counterpart to the excerpt-only
 * `ContentListRow` used in Vorschau. */
export function ContentTimelineEntry({
  item,
  canEdit,
}: {
  item: ContentItem;
  canEdit?: boolean;
}) {
  return (
    <article
      className={cn(
        "bg-card flex flex-col gap-4 rounded-lg border p-5",
        item.internal && "border-l-primary border-l-4",
      )}
    >
      <CoverMedia
        imageUrl={item.coverImageUrl}
        alt={item.title}
        label="BILD"
        sizing="natural"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ContentTypeBadge type={item.type} />
          {item.internal && <InternalOnlyBadge />}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">
            {formatDate(item.date)}
            {item.author && <> · {item.author}</>}
            {item.location && <> · {item.location}</>}
          </span>
          {canEdit && item.id && (
            <Button
              variant="outline"
              size="sm"
              render={
                <Link href={`/admin/news/${item.id}/edit`}>
                  <Pencil className="size-3.5" />
                  Bearbeiten
                </Link>
              }
            />
          )}
        </div>
      </div>
      <h3 className="font-serif text-xl font-bold tracking-tight">
        <Link href={`/news/${item.slug}`} className="hover:text-primary">
          {item.title}
        </Link>
      </h3>
      <MarkdownContent body={item.body} />
    </article>
  );
}
