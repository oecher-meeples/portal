"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { CountAccordionCard } from "@/components/ui/count-accordion-card";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/ui/action-button";
import { CoverMedia } from "@/components/ui/cover-media";
import { SearchInput } from "@/components/ui/search-input";
import { useAction } from "@/components/ui/use-action";
import { useDebouncedValue } from "@/components/ui/use-debounced-value";
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
 * nur lokal ausgeblendet, ohne die Seite neu zu laden. Die Suche filtert nur
 * nach Titel und läuft serverseitig, weil die Liste nur seitenweise geladen
 * ist. Zugeklappt (Akkordeon) zeigt die Karte nur Titel und Zähler; der Inhalt
 * samt Nachlade-Sentinel wird erst beim Aufklappen gerendert.
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
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const searchedQuery = useRef("");
  const searchId = useRef(0);

  const loadMore = useCallback(
    async (next: WantToPlayCursor | undefined) => {
      if (!next || loading.current) return;
      loading.current = true;
      try {
        const page = await loadMoreWantToPlayAction(meepleId, {
          cursor: next,
          query: searchedQuery.current,
        });
        if (!("items" in page)) return;
        setItems((current) => [...current, ...page.items]);
        setCursor(page.nextCursor);
      } finally {
        loading.current = false;
      }
    },
    [meepleId],
  );

  // Neue Suche: erste Seite zum Suchbegriff laden und die Liste ersetzen. Der
  // Anfangszustand (leerer Begriff) ist bereits geladen.
  useEffect(() => {
    if (debouncedQuery === searchedQuery.current) return;
    searchedQuery.current = debouncedQuery;
    const id = ++searchId.current;
    void loadMoreWantToPlayAction(meepleId, { query: debouncedQuery }).then(
      (page) => {
        if (id !== searchId.current || !("items" in page)) return;
        setItems(page.items);
        setCursor(page.nextCursor);
      },
    );
  }, [debouncedQuery, meepleId]);

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
    <CountAccordionCard
      count={remaining}
      label="Das möchte ich spielen"
      className="md:col-span-2"
    >
      <WantToPlayListPanel
        items={items}
        cursor={cursor}
        onLoadMore={loadMore}
        query={query}
        onQueryChange={setQuery}
        hasSearched={debouncedQuery !== ""}
        total={total}
        remaining={remaining}
        isOwner={isOwner}
        onHide={hide}
        clearAll={clearAll}
        onClearAll={() => {
          if (window.confirm("Alle Einträge entfernen?")) {
            void clearAll.run(clearWantToPlayAction);
          }
        }}
      />
    </CountAccordionCard>
  );
}

/** Inhalt der aufgeklappten Karte — eigene Komponente, damit der
 * Nachlade-Sentinel erst mit dem Aufklappen existiert. */
function WantToPlayListPanel({
  items,
  cursor,
  onLoadMore,
  query,
  onQueryChange,
  hasSearched,
  total,
  remaining,
  isOwner,
  onHide,
  clearAll,
  onClearAll,
}: {
  items: WantToPlayItem[];
  cursor: WantToPlayCursor | null;
  onLoadMore: (cursor: WantToPlayCursor | undefined) => void;
  query: string;
  onQueryChange: (value: string) => void;
  hasSearched: boolean;
  total: number;
  remaining: number;
  isOwner: boolean;
  onHide: (id: string) => void;
  clearAll: { pending: boolean; error: string | null };
  onClearAll: () => void;
}) {
  const { sentinelRef } = useInfiniteScroll(items, {
    initialCount: items.length,
    step: 0,
    onLoadMore,
    cursor: cursor ?? undefined,
    hasMore: cursor !== null,
  });

  return (
    <div className="flex flex-col gap-3">
      {isOwner && remaining > 0 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            disabled={clearAll.pending}
            onClick={onClearAll}
          >
            Alles entfernen
          </Button>
        </div>
      )}
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
      {total > 0 && (
        <SearchInput
          value={query}
          onChange={onQueryChange}
          placeholder="Titel suchen"
          className="max-w-sm"
        />
      )}
      {items.length === 0 && hasSearched && (
        <p className="text-muted-foreground text-sm">Keine Treffer.</p>
      )}
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7">
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
                aspect="aspect-square"
                fit="contain"
              />
              <span className="line-clamp-2 text-xs font-medium">
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
                onSuccess={() => onHide(item.id)}
              >
                <X />
              </ActionButton>
            )}
          </li>
        ))}
      </ul>
      <div ref={sentinelRef} />
    </div>
  );
}
