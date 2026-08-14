"use client";

import { useState, type ReactElement } from "react";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { LinkFields } from "@/components/feature/dashboard/link-fields";
import { updateImportantLink } from "@/lib/links/actions";
import type { ImportantLinkRow } from "@/lib/links/links";

export function EditLinkDialog({
  link,
  trigger,
}: {
  link: ImportantLinkRow;
  trigger?: ReactElement;
}) {
  const [title, setTitle] = useState(link.title);
  const [targetUrl, setTargetUrl] = useState(link.targetUrl);
  const [iconUrl, setIconUrl] = useState(link.iconUrl ?? "");

  function reset() {
    setTitle(link.title);
    setTargetUrl(link.targetUrl);
    setIconUrl(link.iconUrl ?? "");
  }

  return (
    <ActionDialog
      trigger={
        trigger ?? (
          <Button variant="outline" size="sm">
            Bearbeiten
          </Button>
        )
      }
      title="Link bearbeiten"
      submitLabel="Änderungen speichern"
      canSubmit={Boolean(title.trim() && targetUrl.trim())}
      action={() =>
        updateImportantLink(link.id, {
          title: title.trim(),
          targetUrl: targetUrl.trim(),
          iconUrl: iconUrl || undefined,
        })
      }
      onReset={reset}
    >
      <LinkFields
        title={title}
        onTitleChange={setTitle}
        targetUrl={targetUrl}
        onTargetUrlChange={setTargetUrl}
        iconUrl={iconUrl}
        onIconUrlChange={setIconUrl}
      />
    </ActionDialog>
  );
}
