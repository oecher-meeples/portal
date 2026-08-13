"use client";

import { useState } from "react";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { LinkFields } from "@/components/feature/admin-links/link-fields";
import { updateImportantLink } from "@/lib/links/actions";
import type { ImportantLinkRow } from "@/components/feature/admin-links/admin-links-view";

export function EditLinkDialog({ link }: { link: ImportantLinkRow }) {
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
        <Button variant="outline" size="sm">
          Bearbeiten
        </Button>
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
