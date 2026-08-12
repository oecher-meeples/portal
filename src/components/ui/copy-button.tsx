"use client";

import { useState } from "react";
import { CheckIcon, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const FEEDBACK_DURATION_MS = 1500;

/** Copies `value` to the clipboard and briefly shows a "Kopiert!" confirmation
 * instead of the usual label — fachfrei, kapselt die Clipboard-API. */
export function CopyButton({
  value,
  label,
  icon: Icon,
}: {
  value: string;
  label: string;
  icon: LucideIcon;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), FEEDBACK_DURATION_MS);
  }

  return (
    <Button variant="outline" onClick={handleCopy}>
      {copied ? <CheckIcon /> : <Icon />}
      {copied ? "Kopiert!" : label}
    </Button>
  );
}
