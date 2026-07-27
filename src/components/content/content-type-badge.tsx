import type { ContentType } from "@/data/content";

const CONTENT_TYPE_META: Record<ContentType, { label: string; emoji: string }> = {
  termin: { label: "Termin", emoji: "📅" },
  blog: { label: "Blog", emoji: "📰" },
  turnier: { label: "Turnier", emoji: "🏆" },
};

export function ContentTypeBadge({ type }: { type: ContentType }) {
  const meta = CONTENT_TYPE_META[type];
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      <span>{meta.emoji}</span>
      {meta.label}
    </span>
  );
}
