import Link from "next/link";
import { Pencil } from "lucide-react";
import type { ContentItem } from "@/lib/content/content";
import { CoverMedia } from "@/components/ui/cover-media";
import { ContentTypeBadge } from "@/components/entities/content-type-badge";
import { InternalOnlyBadge } from "@/components/entities/internal-only-badge";
import { CardCornerOverlay } from "@/components/ui/card-corner-overlay";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { CARD_HOVER_CLASS } from "@/components/ui/card-hover";

export function ContentListRow({
  item,
  canEdit,
}: {
  item: Omit<ContentItem, "body">;
  canEdit?: boolean;
}) {
  return (
    <div
      className={cn(
        "group bg-card flex gap-4 rounded-lg border p-4",
        CARD_HOVER_CLASS,
        item.internal && "border-l-primary border-l-4",
      )}
    >
      <Link href={`/news/${item.slug}`} className="absolute inset-0 z-0">
        <span className="sr-only">{item.title} lesen</span>
      </Link>
      <div className="relative w-28 shrink-0 sm:w-36">
        <CoverMedia
          imageUrl={item.coverImageUrl}
          alt={item.title}
          label="BILD"
          aspect="aspect-square"
          className="pointer-events-none"
        />
        {canEdit && item.id && (
          <CardCornerOverlay corner="top-left">
            <Link
              href={`/admin/news/${item.id}/edit`}
              className="bg-background hover:bg-accent hover:text-accent-foreground inline-flex size-8 items-center justify-center rounded-md border"
              aria-label="Beitrag bearbeiten"
            >
              <Pencil className="size-4" />
            </Link>
          </CardCornerOverlay>
        )}
      </div>
      <div className="pointer-events-none flex flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ContentTypeBadge type={item.type} />
            {item.internal && <InternalOnlyBadge />}
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
    </div>
  );
}
