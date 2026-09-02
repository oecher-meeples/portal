"use client";

import type { ContentItem } from "@/lib/content/content";
import { canManagePostType } from "@/lib/content/post-access";
import { ContentListRow } from "@/components/entities/content-list-row";
import { ContentTimelineEntry } from "@/components/entities/content-timeline-entry";
import { useInfiniteScroll } from "@/components/ui/use-infinite-scroll";

const INITIAL_COUNT = 10;
const STEP = 5;

export type NewsViewMode = "vorschau" | "vollansicht";

/** Renders the filtered/sorted `items` with infinite scroll — split out so
 * it can be remounted (via `key`) on the parent's filter change, resetting
 * `visibleCount` back to `INITIAL_COUNT` (#135). */
export function NewsResultsList({
  items,
  viewMode,
  canEditPublic,
  canEditInternal,
}: {
  items: ContentItem[];
  viewMode: NewsViewMode;
  canEditPublic?: boolean;
  canEditInternal?: boolean;
}) {
  const { visibleItems, sentinelRef } = useInfiniteScroll(items, {
    initialCount: INITIAL_COUNT,
    step: STEP,
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
      {items.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Keine Beiträge in dieser Kategorie.
        </p>
      )}
      <div ref={sentinelRef} />
    </div>
  );
}
