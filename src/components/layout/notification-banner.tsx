"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  mostUrgentNotification,
  type ActiveNotification,
} from "@/lib/notifications/types";
import {
  closeNotification,
  isNotificationClosed,
  pruneStaleClosedEntries,
} from "@/lib/notifications/browser-storage";
import { NOTIFICATION_BANNER_CLASS } from "@/components/entities/notification-tone";

/**
 * Zeigt nur die dringendste, noch nicht (im Banner) geschlossene
 * Notification (#339) — die Glocke daneben zeigt immer alle. Startet mit
 * "nichts geschlossen" (SSR-sicher, `localStorage` existiert erst nach
 * Hydration, analog `useLocalStorageState`) und liest den echten
 * Schließen-Status erst nach dem Mount nach — kurzes Aufblitzen einer
 * bereits geschlossenen Notification ist die akzeptierte Kehrseite.
 */
export function NotificationBanner({
  notifications,
}: {
  notifications: ActiveNotification[];
}) {
  const [closedIds, setClosedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Mount-Guard: localStorage ist erst nach Hydration verfügbar, sonst SSR-Markup-Mismatch (analog use-local-storage-state.ts).
    setClosedIds(
      new Set(
        notifications
          .filter((notification) => isNotificationClosed(notification.id))
          .map((notification) => notification.id),
      ),
    );
  }, [notifications]);

  const visible = notifications.filter(
    (notification) => !closedIds.has(notification.id),
  );
  const current = mostUrgentNotification(visible);
  if (!current) return null;

  function handleClose() {
    if (!current || current.closeable === "no") return;
    pruneStaleClosedEntries(
      notifications.map((notification) => notification.id),
    );
    closeNotification(current.id, current.closeable);
    setClosedIds((prev) => new Set(prev).add(current.id));
  }

  return (
    <div
      role="alert"
      className={cn(
        "mb-4 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm",
        NOTIFICATION_BANNER_CLASS[current.type],
      )}
    >
      <p className="flex-1">{current.message}</p>
      {current.closeable !== "no" && (
        <button
          type="button"
          onClick={handleClose}
          aria-label="Hinweis schließen"
          className="shrink-0 opacity-70 hover:opacity-100"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
