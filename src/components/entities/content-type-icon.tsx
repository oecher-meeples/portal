import {
  CalendarDays,
  Newspaper,
  Trophy,
  LayoutGrid,
  ClipboardList,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ContentType } from "@/lib/content/content";

const CONTENT_TYPE_ICONS: Record<ContentType, LucideIcon> = {
  termin: CalendarDays,
  blog: Newspaper,
  turnier: Trophy,
  umfrage: ClipboardList,
};

/** Icon je Content-Typ, für den Typ-Filter und andere Icon+Text-Anzeigen.
 * `"alle"` liefert ein generisches Layout-Icon. */
export function getContentTypeIcon(type: ContentType | "alle"): LucideIcon {
  return type === "alle" ? LayoutGrid : CONTENT_TYPE_ICONS[type];
}
