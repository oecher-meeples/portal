"use client";

import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import {
  mostUrgentType,
  type ActiveNotification,
} from "@/lib/notifications/types";
import { NOTIFICATION_ICON_CLASS } from "@/components/entities/notification-tone";

/**
 * Zeigt immer *alle* aktiven Notifications als Liste (#339) — unabhängig
 * vom Banner-Schließen-Status, damit nichts vollständig verschwindet.
 * Ausgegraut ohne aktive Notifications, sonst nach höchster Dringlichkeit
 * eingefärbt.
 */
export function NotificationBell({
  notifications,
}: {
  notifications: ActiveNotification[];
}) {
  const urgentType = mostUrgentType(notifications);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={
              notifications.length > 0
                ? `${notifications.length} aktive Hinweise`
                : "Keine aktiven Hinweise"
            }
          />
        }
      >
        <Bell
          className={cn(
            "size-4",
            urgentType
              ? NOTIFICATION_ICON_CLASS[urgentType]
              : "text-muted-foreground",
          )}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-w-[90vw]">
        <p className="text-muted-foreground px-1.5 py-1 text-xs font-medium">
          Hinweise
        </p>
        {notifications.length === 0 ? (
          <p className="text-muted-foreground px-1.5 py-2 text-sm">
            Keine aktiven Hinweise.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {notifications.map((notification) => (
              <li
                key={notification.id}
                className="flex items-start gap-2 rounded-md px-1.5 py-1.5 text-sm"
              >
                <span
                  className={cn(
                    "mt-1.5 size-1.5 shrink-0 rounded-full bg-current",
                    NOTIFICATION_ICON_CLASS[notification.type],
                  )}
                  aria-hidden
                />
                <span>{notification.message}</span>
              </li>
            ))}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
