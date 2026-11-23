import type { EventVisibility } from "@prisma/client";
import { tierAtLeast, type Tier } from "@/lib/utils/nav-config";

/** German wording for the EventVisibility enum — domain vocabulary, mirrors
 * DOWNLOAD_STATUS_LABELS (lib/downloads/labels.ts). */
export const EVENT_VISIBILITY_LABELS: Record<EventVisibility, string> = {
  PUBLIC: "Öffentlich",
  INTERNAL: "Intern",
  DRAFT: "Entwurf",
};

/**
 * Whether an event is visible to a given caller: Entwurf only for
 * `events:manage`-Inhaber, Intern zusätzlich für eingeloggte Meeples,
 * Öffentlich für alle — inkl. Gäste-Bereich (`/events/[slug]/gast`) und der
 * öffentlichen Termine-Seite (`/news`). `canManageEvents` always wins, so an
 * admin previewing/checking a draft event still sees it regardless of tier.
 */
export function isEventVisible(
  visibility: EventVisibility,
  { tier, canManageEvents }: { tier: Tier; canManageEvents: boolean },
): boolean {
  if (canManageEvents) return true;
  if (visibility === "DRAFT") return false;
  if (visibility === "INTERNAL") return tierAtLeast(tier, "mitglied");
  return true;
}
