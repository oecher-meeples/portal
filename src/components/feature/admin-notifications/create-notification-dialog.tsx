"use client";

import { useState } from "react";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { Field, TextField, TextAreaField } from "@/components/ui/field";
import { createManualNotification } from "@/lib/notifications/actions";
import {
  NOTIFICATION_CLOSEABLE_LABELS,
  NOTIFICATION_TYPE_LABELS,
} from "@/lib/notifications/labels";
import type {
  NotificationCloseable,
  NotificationType,
} from "@/lib/notifications/types";

const EVERYONE_VALUE = "__everyone__";

export function CreateNotificationDialog({
  permissions,
}: {
  permissions: { key: string; description: string }[];
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<NotificationType>("info");
  const [audiencePermissionKey, setAudiencePermissionKey] =
    useState(EVERYONE_VALUE);
  const [closeable, setCloseable] = useState<NotificationCloseable>("yes");
  const [message, setMessage] = useState("");

  function reset() {
    setName("");
    setType("info");
    setAudiencePermissionKey(EVERYONE_VALUE);
    setCloseable("yes");
    setMessage("");
  }

  return (
    <ActionDialog
      trigger={<Button size="sm">+ Neue Notification</Button>}
      title="Neue System-Notification"
      submitLabel="Anlegen"
      canSubmit={Boolean(name.trim() && message.trim())}
      action={() =>
        createManualNotification({
          name: name.trim(),
          type,
          audiencePermissionKey:
            audiencePermissionKey === EVERYONE_VALUE
              ? null
              : audiencePermissionKey,
          closeable,
          message: message.trim(),
        })
      }
      onReset={reset}
    >
      <div className="flex flex-col gap-4">
        <TextField
          id="notification-name"
          label="Name (intern, für die Übersicht)"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="z. B. Wartungsankündigung Oktober"
          required
        />
        <TextAreaField
          id="notification-message"
          label="Anzeigetext"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          required
        />
        <Field label="Dringlichkeit" htmlFor="notification-type">
          <select
            id="notification-type"
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
            value={type}
            onChange={(event) =>
              setType(event.target.value as NotificationType)
            }
          >
            {Object.entries(NOTIFICATION_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Zielgruppe" htmlFor="notification-audience">
          <select
            id="notification-audience"
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
            value={audiencePermissionKey}
            onChange={(event) => setAudiencePermissionKey(event.target.value)}
          >
            <option value={EVERYONE_VALUE}>Alle (auch Gäste)</option>
            {permissions.map((permission) => (
              <option key={permission.key} value={permission.key}>
                {permission.key} — {permission.description}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Schließbarkeit im Banner"
          htmlFor="notification-closeable"
        >
          <select
            id="notification-closeable"
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
            value={closeable}
            onChange={(event) =>
              setCloseable(event.target.value as NotificationCloseable)
            }
          >
            {Object.entries(NOTIFICATION_CLOSEABLE_LABELS).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ),
            )}
          </select>
        </Field>
      </div>
    </ActionDialog>
  );
}
