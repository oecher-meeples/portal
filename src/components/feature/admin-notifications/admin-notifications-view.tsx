"use client";

import { Trash2 } from "lucide-react";
import { PageHeading } from "@/components/ui/page-heading";
import { PageContainer } from "@/components/ui/page-container";
import { StatusPill } from "@/components/ui/status-pill";
import { ActionButton } from "@/components/ui/action-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateNotificationDialog } from "@/components/feature/admin-notifications/create-notification-dialog";
import {
  deleteManualNotification,
  setAutomatedNotificationDisabled,
  setManualNotificationActive,
} from "@/lib/notifications/actions";
import { NOTIFICATION_STATUS_TONE } from "@/components/entities/notification-tone";
import {
  NOTIFICATION_CLOSEABLE_LABELS,
  NOTIFICATION_TYPE_LABELS,
} from "@/lib/notifications/labels";
import type {
  NotificationCloseable,
  NotificationType,
} from "@/lib/notifications/types";

export type ManualNotificationRow = {
  id: string;
  name: string;
  type: NotificationType;
  audiencePermissionKey: string | null;
  closeable: NotificationCloseable;
  message: string;
  isActive: boolean;
};

export type AutomatedNotificationRow = {
  name: string;
  type: NotificationType;
  audiencePermissionKey: string | null;
  closeable: NotificationCloseable;
  isDisabled: boolean;
};

/** CRUD-Seite für globale System-Notifications (#339), Recht
 * `notifications:manage`. Manuelle Notifications: anlegen/deaktivieren/
 * löschen. Automatisierte (Code-Registry, `registry.ts`): nur deaktivierbar
 * — Name, Typ, Zielgruppe, Text bleiben Code, nicht hier editierbar. */
export function AdminNotificationsView({
  manual,
  automated,
  permissions,
}: {
  manual: ManualNotificationRow[];
  automated: AutomatedNotificationRow[];
  permissions: { key: string; description: string }[];
}) {
  return (
    <PageContainer className="gap-6">
      <PageHeading
        eyebrow="Administration"
        title="System-Notifications"
        description="Banner (dringendste) und Glocken-Liste (alle) im Header — für systemweite Hinweise, die an niemanden feature-spezifisch gebunden sind."
        action={<CreateNotificationDialog permissions={permissions} />}
      />

      <div className="flex flex-col gap-3">
        <h2 className="font-serif text-lg font-bold">Manuelle Notifications</h2>
        {manual.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Noch keine manuellen Notifications angelegt.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Name</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Zielgruppe</TableHead>
                  <TableHead>Schließbarkeit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right"> </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {manual.map((notification) => (
                  <TableRow key={notification.id}>
                    <TableCell className="max-w-xs">
                      <span className="font-medium">{notification.name}</span>
                      <p className="text-muted-foreground truncate text-xs">
                        {notification.message}
                      </p>
                    </TableCell>
                    <TableCell>
                      <StatusPill
                        label={NOTIFICATION_TYPE_LABELS[notification.type]}
                        tone={NOTIFICATION_STATUS_TONE[notification.type]}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {notification.audiencePermissionKey ??
                        "Alle (auch Gäste)"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {NOTIFICATION_CLOSEABLE_LABELS[notification.closeable]}
                    </TableCell>
                    <TableCell>
                      <StatusPill
                        label={notification.isActive ? "aktiv" : "deaktiviert"}
                        tone={notification.isActive ? "positive" : "neutral"}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <ActionButton
                          variant="outline"
                          size="sm"
                          action={setManualNotificationActive.bind(
                            null,
                            notification.id,
                            !notification.isActive,
                          )}
                        >
                          {notification.isActive
                            ? "Deaktivieren"
                            : "Aktivieren"}
                        </ActionButton>
                        <ActionButton
                          variant="destructive"
                          size="icon-sm"
                          confirm="Notification wirklich löschen?"
                          action={deleteManualNotification.bind(
                            null,
                            notification.id,
                          )}
                          aria-label={`"${notification.name}" löschen`}
                        >
                          <Trash2 className="size-3.5" />
                        </ActionButton>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-serif text-lg font-bold">
          Automatisierte Notifications
        </h2>
        {automated.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Aktuell keine automatisierten Notifications registriert — konkrete
            erste (z. B. DB-Füllstand, verdächtige Logins) sind eigene
            Folge-Issues.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Name</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Zielgruppe</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right"> </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {automated.map((notification) => (
                  <TableRow key={notification.name}>
                    <TableCell className="font-medium">
                      {notification.name}
                    </TableCell>
                    <TableCell>
                      <StatusPill
                        label={NOTIFICATION_TYPE_LABELS[notification.type]}
                        tone={NOTIFICATION_STATUS_TONE[notification.type]}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {notification.audiencePermissionKey ??
                        "Alle (auch Gäste)"}
                    </TableCell>
                    <TableCell>
                      <StatusPill
                        label={
                          notification.isDisabled ? "deaktiviert" : "aktiv"
                        }
                        tone={notification.isDisabled ? "neutral" : "positive"}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <ActionButton
                        variant="outline"
                        size="sm"
                        action={setAutomatedNotificationDisabled.bind(
                          null,
                          notification.name,
                          !notification.isDisabled,
                        )}
                      >
                        {notification.isDisabled
                          ? "Aktivieren"
                          : "Deaktivieren"}
                      </ActionButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
