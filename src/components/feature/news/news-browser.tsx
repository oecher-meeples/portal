"use client";

import { useState } from "react";
import { CalendarDays, Eye, Rows3 } from "lucide-react";
import {
  CONTENT_TYPE_FILTERS,
  type ContentItem,
  type ContentType,
} from "@/lib/content/content";
import { PillToggle, type PillOption } from "@/components/ui/pill-toggle";
import { Button } from "@/components/ui/button";
import {
  BottomSheet,
  BottomSheetTrigger,
  BottomSheetContent,
} from "@/components/ui/bottom-sheet";
import { getContentTypeIcon } from "@/components/entities/content-type-icon";
import { formatDate } from "@/lib/utils/format";
import { NewsCalendar } from "@/components/feature/news/news-calendar";
import {
  NewsResultsList,
  type NewsViewMode,
} from "@/components/feature/news/news-results-list";
import { loadMoreNews } from "@/components/feature/news/actions";

/** #424: Kategorie "Umfragen" gehört nicht in die Filterleiste für Gäste —
 * es gibt keine öffentlichen Umfragen, nur Meeple sind abstimmungsberechtigt. */
function typeFilterOptions(
  canSeeSurveys: boolean,
): PillOption<ContentType | "alle">[] {
  return CONTENT_TYPE_FILTERS.filter(
    (option) => canSeeSurveys || option.value !== "umfrage",
  ).map((option) => ({
    ...option,
    icon: getContentTypeIcon(option.value),
  }));
}

const VIEW_MODE_OPTIONS: PillOption<NewsViewMode>[] = [
  { label: "Vorschau", value: "vorschau", icon: Eye },
  { label: "Vollansicht", value: "vollansicht", icon: Rows3 },
];

export function NewsBrowser({
  items: initialItems,
  hasMore: initialHasMore,
  nextCursor: initialNextCursor,
  icsUrl,
  canEditPublic,
  canEditInternal,
  canSeeInternal,
  canSeeSurveys,
}: {
  items: ContentItem[];
  /** Serverseitige DB-Post-Pagination (#469/#470) — ohne Angabe (z. B. in
   * älteren Tests) wird angenommen, dass `items` bereits alles ist. */
  hasMore?: boolean;
  nextCursor?: string | null;
  icsUrl?: string;
  canEditPublic?: boolean;
  canEditInternal?: boolean;
  canSeeInternal?: boolean;
  canSeeSurveys?: boolean;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filter, setFilter] = useState<ContentType | "alle">("alle");
  const [onlyInternal, setOnlyInternal] = useState(false);
  const [viewMode, setViewMode] = useState<NewsViewMode>("vorschau");
  // < lg: Kalender steht sonst als Grid-Zweitspalte ganz unten unter der
  // Ergebnisliste — dort stattdessen über ein Bottom-Sheet erreichbar.
  const [calendarSheetOpen, setCalendarSheetOpen] = useState(false);

  // Vom Server initial geladene Seite (#470) — wächst clientseitig, wenn
  // useInfiniteScroll (Server-Request-Modus) das Ende erreicht. Bleibt hier
  // in NewsBrowser (nicht in NewsResultsList), damit die Seite beim
  // Remount von NewsResultsList (Filterwechsel, s. u.) nicht verloren geht.
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore ?? false);
  const [nextCursor, setNextCursor] = useState(initialNextCursor ?? null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  async function handleLoadMore(cursor: string) {
    setIsLoadingMore(true);
    try {
      const page = await loadMoreNews(cursor);
      setItems((current) => [...current, ...page.items]);
      setHasMore(page.hasMore);
      setNextCursor(page.nextCursor);
    } finally {
      setIsLoadingMore(false);
    }
  }

  function selectDateAndCloseSheet(date: string | null) {
    setSelectedDate(date);
    setCalendarSheetOpen(false);
  }

  const visible = items
    .filter((item) => !selectedDate || item.date === selectedDate)
    .filter((item) => filter === "alle" || item.type === filter)
    .filter((item) => !onlyInternal || item.internal);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <PillToggle
            options={typeFilterOptions(!!canSeeSurveys)}
            value={filter}
            onChange={setFilter}
          />
          <PillToggle
            options={VIEW_MODE_OPTIONS}
            value={viewMode}
            onChange={setViewMode}
          />
          {canSeeInternal && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={onlyInternal}
                onChange={(event) => setOnlyInternal(event.target.checked)}
              />
              Nur interne anzeigen
            </label>
          )}
          <BottomSheet
            open={calendarSheetOpen}
            onOpenChange={setCalendarSheetOpen}
          >
            <BottomSheetTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 lg:hidden"
                />
              }
            >
              <CalendarDays className="size-4" />
              Nach Datum filtern
            </BottomSheetTrigger>
            <BottomSheetContent title="Kalender">
              <NewsCalendar
                items={items}
                selectedDate={selectedDate}
                onSelectDate={selectDateAndCloseSheet}
                icsUrl={icsUrl}
              />
            </BottomSheetContent>
          </BottomSheet>
        </div>
        {selectedDate && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">
              Gefiltert auf{" "}
              <strong className="text-foreground">
                {formatDate(selectedDate)}
              </strong>
            </span>
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              className="text-primary shrink-0 hover:underline"
            >
              Alle anzeigen
            </button>
          </div>
        )}
      </div>
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <NewsResultsList
          key={`${filter}-${onlyInternal}-${selectedDate ?? ""}`}
          items={visible}
          viewMode={viewMode}
          canEditPublic={canEditPublic}
          canEditInternal={canEditInternal}
          onLoadMore={handleLoadMore}
          cursor={nextCursor}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
        />
        {/* < lg: Kalender nur noch über das Bottom-Sheet oben (s. "Nach
            Datum filtern") erreichbar, nicht mehr zusätzlich hier unten. */}
        <div className="hidden lg:block">
          <NewsCalendar
            items={items}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            icsUrl={icsUrl}
          />
        </div>
      </div>
    </div>
  );
}
