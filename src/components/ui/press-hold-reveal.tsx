"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

export type RevealResult = { error: string } | { success: true; value: string };

/**
 * Fachfrei: zeigt einen Wert nur, solange der Auge-Button gedrückt gehalten
 * wird — losgelassen, sofort wieder maskiert. Jedes Halten löst einen neuen
 * `reveal()`-Aufruf aus (kein Client-seitiges Zwischenspeichern), damit ein
 * serverseitiges Protokoll (z. B. `SINGLE_REVEAL`) jedes Aufdecken einzeln
 * erfasst — nicht nur das erste.
 */
export function PressHoldReveal({
  reveal,
  onError,
}: {
  reveal: () => Promise<RevealResult>;
  onError?: (message: string) => void;
}) {
  const [value, setValue] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handlePress() {
    setPending(true);
    const result = await reveal();
    setPending(false);

    if ("error" in result) {
      onError?.(result.error);
      return;
    }
    setValue(result.value);
  }

  function handleRelease() {
    setValue(null);
  }

  return (
    <span className="inline-flex items-center gap-2">
      {value && <span className="font-mono">{value}</span>}
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={pending}
        onMouseDown={handlePress}
        onMouseUp={handleRelease}
        onMouseLeave={handleRelease}
        onTouchStart={handlePress}
        onTouchEnd={handleRelease}
        aria-label="Aufdecken (gedrückt halten)"
      >
        <Eye className="size-4" />
      </Button>
    </span>
  );
}
