"use client";

import { useState } from "react";
import { Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { ActionDialog } from "@/components/ui/action-dialog";
import { TextField, TextAreaField } from "@/components/ui/field";
import { submitFeedback } from "@/components/feature/feedback/actions";

function initialMessage() {
  const url = typeof window !== "undefined" ? window.location.href : "";
  return `Seite: ${url}\n\n`;
}

/**
 * Käfer-Icon im Header, für jeden eingeloggten Meeple sichtbar (#282) — legt
 * beim Absenden ein Sub-Issue am Feedback-Epic (#281) an.
 */
export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  function handleOpen() {
    setSubject("");
    setMessage(initialMessage());
    setOpen(true);
  }

  return (
    <>
      <Tooltip content="Feedback einreichen">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Feedback einreichen"
          onClick={handleOpen}
        >
          <Bug className="size-4" />
        </Button>
      </Tooltip>
      <ActionDialog
        open={open}
        onOpenChange={setOpen}
        title="Feedback einreichen"
        submitLabel="Senden"
        pendingLabel="Sende…"
        canSubmit={subject.trim() !== "" && message.trim() !== ""}
        action={() => submitFeedback(subject, message)}
      >
        <TextField
          id="feedback-subject"
          label="Betreff"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
        />
        <TextAreaField
          id="feedback-message"
          label="Nachricht"
          rows={6}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
      </ActionDialog>
    </>
  );
}
