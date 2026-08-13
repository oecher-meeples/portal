"use client";

import { useState } from "react";
import {
  CONTENT_TYPE_FILTERS,
  type ContentItem,
  type ContentType,
} from "@/lib/content/content";
import { ContentListRow } from "@/components/entities/content-list-row";
import { PillToggle } from "@/components/ui/pill-toggle";
import { formatDate } from "@/lib/utils/format";
import { NewsCalendar } from "@/components/feature/news/news-calendar";

export function NewsBrowser({
  items,
  icsUrl,
  canEdit,
  canSeeInternal,
}: {
  items: Omit<ContentItem, "body">[];
  icsUrl?: string;
  canEdit?: boolean;
  canSeeInternal?: boolean;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filter, setFilter] = useState<ContentType | "alle">("alle");
  const [onlyInternal, setOnlyInternal] = useState(false);

  const visible = items
    .filter((item) => !selectedDate || item.date === selectedDate)
    .filter((item) => filter === "alle" || item.type === filter)
    .filter((item) => !onlyInternal || item.internal);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <PillToggle
            options={CONTENT_TYPE_FILTERS}
            value={filter}
            onChange={setFilter}
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
        <div className="flex flex-col gap-3">
          {visible.map((item) => (
            <ContentListRow key={item.slug} item={item} canEdit={canEdit} />
          ))}
          {visible.length === 0 && (
            <p className="text-muted-foreground text-sm">
              Keine Beiträge in dieser Kategorie.
            </p>
          )}
        </div>
        <NewsCalendar
          items={items}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          icsUrl={icsUrl}
        />
      </div>
    </div>
  );
}
