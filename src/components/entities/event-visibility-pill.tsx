import type { EventVisibility } from "@prisma/client";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { EVENT_VISIBILITY_LABELS } from "@/lib/events/visibility";

const TONES: Record<EventVisibility, StatusTone> = {
  PUBLIC: "positive",
  INTERNAL: "info",
  DRAFT: "neutral",
};

/** The one place that knows how an event's visibility looks. */
export function EventVisibilityPill({
  visibility,
}: {
  visibility: EventVisibility;
}) {
  return (
    <StatusPill
      label={EVENT_VISIBILITY_LABELS[visibility]}
      tone={TONES[visibility]}
    />
  );
}
