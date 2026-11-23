"use client";

import { useState } from "react";
import { CheckIcon, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RevealResult } from "@/components/ui/press-hold-reveal";

const FEEDBACK_DURATION_MS = 1500;

/**
 * Copies `value` to the clipboard and briefly shows a "Kopiert!" confirmation
 * instead of the usual label — fachfrei, kapselt die Clipboard-API.
 *
 * `value` kann statt eines fertigen Strings auch ein `reveal()`-Aufruf sein
 * (wie bei `PressHoldReveal`) — dann wird beim Klick erst serverseitig
 * aufgedeckt (inkl. Protokollierung) und danach kopiert, ohne den Wert
 * dauerhaft sichtbar zu machen.
 */
export function CopyButton({
  value,
  label,
  icon: Icon,
  size,
  onError,
}: {
  value: string | (() => Promise<RevealResult>);
  label: string;
  icon: LucideIcon;
  size?: React.ComponentProps<typeof Button>["size"];
  onError?: (message: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (typeof value === "string") {
      await navigator.clipboard.writeText(value);
    } else {
      const result = await value();
      if ("error" in result) {
        onError?.(result.error);
        return;
      }
      await navigator.clipboard.writeText(result.value);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), FEEDBACK_DURATION_MS);
  }

  return (
    <Button type="button" variant="outline" size={size} onClick={handleCopy}>
      {copied ? <CheckIcon /> : <Icon />}
      {copied ? "Kopiert!" : label}
    </Button>
  );
}
