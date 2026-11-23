import {
  CONTENT_TYPE_LABELS,
  type ContentType,
} from "@/lib/content/content-types";

const CONTENT_TYPE_EMOJI: Record<ContentType, string> = {
  termin: "📅",
  blog: "📰",
  turnier: "🏆",
  umfrage: "📊",
};

export function ContentTypeBadge({ type }: { type: ContentType }) {
  return (
    <span className="bg-muted text-muted-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
      <span>{CONTENT_TYPE_EMOJI[type]}</span>
      {CONTENT_TYPE_LABELS[type]}
    </span>
  );
}
