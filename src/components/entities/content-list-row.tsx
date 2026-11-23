import { CardTitle, cardVariants } from "@/components/ui/card";
import Link from "next/link";
import { Pencil } from "lucide-react";
import type { ContentItem } from "@/lib/content/content-types";
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
        cardVariants({ size: "sm" }),
        "group flex-row gap-4",
        CARD_HOVER_CLASS,
        item.internal && "border-l-primary border-l-4",
      )}
    >
      <Link href={`/news/${item.slug}`} className="absolute inset-0 z-0">
        <span className="sr-only">{item.title} lesen</span>
      </Link>
      <div className="relative w-20 shrink-0 sm:w-36">
        <CoverMedia
          sizes="144px"
          imageUrl={item.coverImageUrl}
          alt={item.title}
          label="BILD"
          aspect="aspect-square"
          className="pointer-events-none"
          placeholderVariant="logo"
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
      {/* #583: `min-w-0`, sonst drücken lange Wörter die Karte über den
          Viewport. Grid statt Flex, damit das Datum ohne Doppel-Rendering
          auf `< sm` in eine eigene Zeile unter den Titel rutscht und ab `sm`
          wie bisher rechts neben den Badges steht. */}
      <div className="pointer-events-none grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] content-start gap-x-2 gap-y-1.5">
        <div className="col-span-2 row-start-1 flex flex-wrap items-center gap-2 sm:col-span-1">
          <ContentTypeBadge type={item.type} />
          {item.internal && <InternalOnlyBadge />}
        </div>
        <span className="bg-muted text-muted-foreground col-span-2 row-start-3 justify-self-start rounded px-2 py-0.5 font-mono text-xs sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:self-center sm:justify-self-end">
          {formatDate(item.date)}
        </span>
        <CardTitle
          as="h3"
          className="group-hover:text-primary col-span-2 row-start-2 font-semibold"
        >
          {item.title}
        </CardTitle>
        <p className="text-muted-foreground col-span-2 row-start-4 text-sm sm:row-start-3">
          {item.excerpt}
        </p>
      </div>
    </div>
  );
}
