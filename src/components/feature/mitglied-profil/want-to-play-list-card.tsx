"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/ui/action-button";
import { CoverMedia } from "@/components/ui/cover-media";
import { useAction } from "@/components/ui/use-action";
import { useInfiniteScroll } from "@/components/ui/use-infinite-scroll";
import {
  clearWantToPlayAction,
  loadMoreWantToPlayAction,
  removeWantToPlayEntryAction,
} from "@/components/feature/mitglied-profil/want-to-play-list-actions";
import type {
  WantToPlayCursor,
  WantToPlayItem,
} from "@/lib/ludothek/want-to-play-list";

/**
 * Karte „Das möchte ich spielen" auf dem Profil (#637): Raster aus Cover und
 * Titel, 25 Einträge je Nachlade-Schritt beim Scrollen. Die Besitzerin kann
 * einzelne Einträge (rotes x) oder alle entfernen; entfernte Einträge werden
 * nur lokal ausgeblendet, ohne die Seite neu zu laden.
 */
export function WantToPlayListCard({
  meepleId,
  initialItems,
  initialCursor,
  total,
  isOwner,
}: {
  meepleId: string;
  initialItems: WantToPlayItem[];
  initialCursor: WantToPlayCursor | null;
  total: number;
  isOwner: boolean;
}) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [removedCount, setRemovedCount] = useState(0);
  const loading = useRef(false);

  const loadMore = useCallback(
    async (next: WantToPlayCursor | undefined) => {
      if (!next || loading.current) return;
      loading.current = true;
      try {
        const page = await loadMoreWantToPlayAction(meepleId, next);
        if (!("items" in page)) return;
        setItems((current) => [...current, ...page.items]);
        setCursor(page.nextCursor);
      } finally {
        loading.current = false;
      }
    },
    [meepleId],
  );
  const { sentinelRef } = useInfiniteScroll(items, {
    initialCount: items.length,
    step: 0,
    onLoadMore: loadMore,
    cursor: cursor ?? undefined,
    hasMore: cursor !== null,
  });
  const clearAll = useAction({
    onSuccess: () => {
      setItems([]);
      setCursor(null);
      setRemovedCount(total);
    },
  });

  const remaining = total - removedCount;
  const hide = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
    setRemovedCount((count) => count + 1);
  };

  return (
    <Card className="md:col-span-2">
      <div className="flex items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          Das möchte ich spielen
          <Badge>{remaining}</Badge>
        </CardTitle>
        {isOwner && remaining > 0 && (
          <Button
            variant="outline"
            size="sm"
            disabled={clearAll.pending}
            onClick={() => {
              if (window.confirm("Alle Einträge entfernen?")) {
                void clearAll.run(clearWantToPlayAction);
              }
            }}
          >
            Alles entfernen
          </Button>
        )}
      </div>
      {clearAll.error && (
        <p role="alert" className="text-destructive text-sm">
          {clearAll.error}
        </p>
      )}
      {isOwner && (
        <p className="text-muted-foreground text-sm">
          {remaining === 0
            ? "Noch nichts auf der Liste. Importiere deine BGG-Liste oder markiere Spiele mit „Ich will das auch spielen“. "
            : ""}
          Spiele, die auf BGG als Want to Play stehen, kommen beim nächsten
          Import wieder, solange der Import aktiv ist.
        </p>
      )}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((item) => (
          <li key={item.id} className="relative">
            <Link
              href={`/ludothek/${item.slug}`}
              target="_blank"
              className="flex flex-col gap-1"
            >
              <CoverMedia
                imageUrl={item.imageUrl}
                alt={item.title}
                aspect="aspect-[3/4]"
              />
              <span className="line-clamp-2 text-sm font-medium">
                {item.title}
              </span>
            </Link>
            {isOwner && (
              <ActionButton
                variant="outline"
                size="icon-xs"
                aria-label={`${item.title} entfernen`}
                className="text-destructive bg-background absolute top-1 right-1"
                action={() => removeWantToPlayEntryAction(item.boardGameId)}
                onSuccess={() => hide(item.id)}
              >
                <X />
              </ActionButton>
            )}
          </li>
        ))}
      </ul>
      <div ref={sentinelRef} />
    </Card>
  );
}
