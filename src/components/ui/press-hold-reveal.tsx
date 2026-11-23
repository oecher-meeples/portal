"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

export type RevealResult = { error: string } | { success: true; value: string };

/**
 * Fachfrei: ein Button, der einen Wert nur aufdeckt, solange er gedrückt
 * gehalten wird — losgelassen, sofort wieder maskiert. Jedes Halten löst
 * einen neuen `reveal()`-Aufruf aus (kein Client-seitiges
 * Zwischenspeichern), damit ein serverseitiges Protokoll (z. B.
 * `SINGLE_REVEAL`) jedes Aufdecken einzeln erfasst — nicht nur das erste.
 *
 * Rendert bewusst NUR den Button, nicht den aufgedeckten Wert selbst — der
 * soll das maskierte Feld beim Aufdecken direkt ablösen (gleiche Stelle,
 * fixe Breite), nicht als zusätzliches Element danach erscheinen. Der
 * Aufrufer hält den Wert per `onValueChange` selbst und rendert ihn an der
 * gewünschten Stelle.
 */
export function PressHoldReveal({
  reveal,
  onError,
  onValueChange,
}: {
  reveal: () => Promise<RevealResult>;
  onError?: (message: string) => void;
  /** `value` beim Aufdecken, `null` beim Loslassen — der Aufrufer entscheidet
   * selbst, wo/wie der Wert an Stelle der Maskierung angezeigt wird. */
  onValueChange: (value: string | null) => void;
}) {
  const [pending, setPending] = useState(false);

  async function handlePress() {
    setPending(true);
    const result = await reveal();
    setPending(false);

    if ("error" in result) {
      onError?.(result.error);
      return;
    }
    onValueChange(result.value);
  }

  function handleRelease() {
    onValueChange(null);
  }

  return (
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
  );
}
