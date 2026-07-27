"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const MODES = ["Ausleihe", "Rückgabe", "Inventur-Prüfbogen"] as const;

export function ScanModeSwitcher() {
  const [mode, setMode] = useState<(typeof MODES)[number]>("Ausleihe");

  return (
    <p className="rounded-md bg-primary/10 p-3 text-sm">
      Modus wechseln:{" "}
      {MODES.map((m, index) => (
        <span key={m}>
          <button
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              "underline-offset-2 hover:underline",
              mode === m ? "font-bold" : "text-muted-foreground",
            )}
          >
            {m}
          </button>
          {index < MODES.length - 1 && " · "}
        </span>
      ))}
    </p>
  );
}
