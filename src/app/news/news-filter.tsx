"use client";

import { useState } from "react";
import type { ContentItem, ContentType } from "@/lib/content";
import { ContentListRow } from "@/components/content/content-list-row";
import { PillToggle } from "@/components/shared/pill-toggle";
import { formatDate } from "@/lib/format";

const FILTERS: { label: string; value: ContentType | "alle" }[] = [
  { label: "Alle", value: "alle" },
  { label: "Termine", value: "termin" },
  { label: "Blog", value: "blog" },
  { label: "Turniere", value: "turnier" },
];

export function NewsFilter({
  items,
  selectedDate,
  onClearDate,
}: {
  items: ContentItem[];
  selectedDate?: string | null;
  onClearDate?: () => void;
}) {
  const [filter, setFilter] = useState<ContentType | "alle">("alle");
  const visible = items.filter(
    (item) => filter === "alle" || item.type === filter,
  );

  return (
    <div className="flex flex-col gap-4">
      <PillToggle options={FILTERS} value={filter} onChange={setFilter} />
      {selectedDate && (
        <div className="bg-muted/40 flex items-center justify-between gap-3 rounded-md border border-dashed px-3 py-2 text-sm">
          <span className="text-muted-foreground">
            Ansicht gefiltert auf{" "}
            <strong className="text-foreground">
              {formatDate(selectedDate)}
            </strong>
          </span>
          <button
            type="button"
            onClick={onClearDate}
            className="text-primary shrink-0 hover:underline"
          >
            Alle anzeigen
          </button>
        </div>
      )}
      <div className="flex flex-col gap-3">
        {visible.map((item) => (
          <ContentListRow key={item.slug} item={item} />
        ))}
        {visible.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Keine Beiträge in dieser Kategorie.
          </p>
        )}
      </div>
    </div>
  );
}
