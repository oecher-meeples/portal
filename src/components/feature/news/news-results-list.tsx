"use client";

import type { ContentItem } from "@/lib/content/content-types";
import { canManagePostType } from "@/lib/content/post-access";
import { ContentListRow } from "@/components/entities/content-list-row";
import { ContentTimelineEntry } from "@/components/entities/content-timeline-entry";
import { useInfiniteScroll } from "@/components/ui/use-infinite-scroll";
import { Skeleton } from "@/components/ui/skeleton";

export type NewsViewMode = "vorschau" | "vollansicht";

/** Renders `items` (bereits serverseitig auf Seiten à 10 paginiert, #469)
 * mit echtem Server-Nachladen: `onLoadMore` löst über den erweiterten
 * `useInfiniteScroll`-Hook (#468) einen Server-Action-Request statt eines
 * bloßen Client-seitigen Reveals aus (#470). */
export function NewsResultsList({
  items,
  viewMode,
  canEditPublic,
  canEditInternal,
  onLoadMore,
  cursor,
  hasMore,
  isLoadingMore,
}: {
  items: ContentItem[];
  viewMode: NewsViewMode;
  canEditPublic?: boolean;
  canEditInternal?: boolean;
  onLoadMore: (cursor: string) => void;
  cursor: string | null;
  hasMore: boolean;
  isLoadingMore: boolean;
}) {
  const { visibleItems, sentinelRef, isEndReached } = useInfiniteScroll(items, {
    initialCount: items.length,
    step: 0,
    onLoadMore,
    cursor: cursor ?? undefined,
    hasMore,
  });
  const perms = {
    canEditPublic: Boolean(canEditPublic),
    canEditInternal: Boolean(canEditInternal),
  };

  return (
    <div className="flex flex-col gap-3">
      {visibleItems.map((item) => {
        const canEdit = canManagePostType(perms, item.internal);
        return viewMode === "vorschau" ? (
          <ContentListRow key={item.slug} item={item} canEdit={canEdit} />
        ) : (
          <ContentTimelineEntry key={item.slug} item={item} canEdit={canEdit} />
        );
      })}
      {items.length === 0 && !isLoadingMore && (
        <p className="text-muted-foreground text-sm">
          Keine Beiträge in dieser Kategorie.
        </p>
      )}
      {isLoadingMore && (
        <>
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </>
      )}
      {items.length > 0 && isEndReached && !isLoadingMore && (
        <p className="text-muted-foreground py-2 text-center text-sm">
          Keine weiteren Beiträge.
        </p>
      )}
      <div ref={sentinelRef} />
    </div>
  );
}
