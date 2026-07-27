"use client";

import { useState } from "react";
import type { ContentItem, ContentType } from "@/data/content";
import { ContentListRow } from "@/components/content/content-list-row";
import { PillToggle } from "@/components/shared/pill-toggle";

const FILTERS: { label: string; value: ContentType | "alle" }[] = [
  { label: "Alle", value: "alle" },
  { label: "Termine", value: "termin" },
  { label: "Blog", value: "blog" },
  { label: "Turniere", value: "turnier" },
];

export function NewsFilter({ items }: { items: ContentItem[] }) {
  const [filter, setFilter] = useState<ContentType | "alle">("alle");
  const visible = items.filter(
    (item) => filter === "alle" || item.type === filter,
  );

  return (
    <div className="flex flex-col gap-4">
      <PillToggle options={FILTERS} value={filter} onChange={setFilter} />
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
