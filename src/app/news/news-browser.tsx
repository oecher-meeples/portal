"use client";

import { useState } from "react";
import type { ContentItem } from "@/lib/content";
import { NewsFilter } from "@/app/news/news-filter";
import { NewsCalendar } from "@/app/news/news-calendar";

export function NewsBrowser({
  items,
  icsUrl,
}: {
  items: ContentItem[];
  icsUrl?: string;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const visibleItems = selectedDate
    ? items.filter((item) => item.date === selectedDate)
    : items;

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <NewsFilter items={visibleItems} />
      <NewsCalendar
        items={items}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        icsUrl={icsUrl}
      />
    </div>
  );
}
