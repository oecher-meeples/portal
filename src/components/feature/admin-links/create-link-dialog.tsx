"use client";

import { useState } from "react";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { LinkFields } from "@/components/feature/admin-links/link-fields";
import { createImportantLink } from "@/lib/links/actions";

export function CreateLinkDialog() {
  const [title, setTitle] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [iconUrl, setIconUrl] = useState("");

  function reset() {
    setTitle("");
    setTargetUrl("");
    setIconUrl("");
  }

  return (
    <ActionDialog
      trigger={<Button size="sm">+ Neuer Link</Button>}
      title="Neuer Link"
      submitLabel="Link erstellen"
      canSubmit={Boolean(title.trim() && targetUrl.trim())}
      action={() =>
        createImportantLink({
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
