"use client";

import { useState } from "react";
import type { ContentItem } from "@/lib/content";
import { NewsFilter } from "@/components/feature/news/news-filter";
import { NewsCalendar } from "@/components/feature/news/news-calendar";

export function NewsBrowser({
  items,
  icsUrl,
  canEdit,
}: {
  items: ContentItem[];
  icsUrl?: string;
  canEdit?: boolean;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const visibleItems = selectedDate
    ? items.filter((item) => item.date === selectedDate)
    : items;

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <NewsFilter
        items={visibleItems}
        selectedDate={selectedDate}
        onClearDate={() => setSelectedDate(null)}
        canEdit={canEdit}
      />
      <NewsCalendar
        items={items}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        icsUrl={icsUrl}
      />
    </div>
  );
}
