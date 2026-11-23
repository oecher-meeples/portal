"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip } from "@/components/ui/tooltip";
import { useAction } from "@/components/ui/use-action";
import { setMarketNewsletterOptIn } from "@/lib/members/market-newsletter";

const DESCRIPTION =
  "Tägliche Sammel-E-Mail mit allen neuen Marktplatz-Angeboten des Tages, sofern welche eingestellt wurden.";

/**
 * Sofort speichernder An/Aus-Schalter für den Marktplatz-Newsletter (#254),
 * eigenständig statt Teil des großen Profil-Formulars (#278-Folge) — so
 * lässt er sich sowohl in der Newsletter-Karte im Profil als auch dezent
 * auf der Marktplatz-Seite einbauen, ohne dass `feature/profil` und
 * `feature/markt` sich gegenseitig importieren (CLAUDE.md-Schichtregel).
 * Kompakt: die Erklärung steckt in einem Tooltip statt einem Untertitel.
 */
export function MarketNewsletterToggle({
  initialEnabled,
  className,
}: {
  initialEnabled: boolean;
  className?: string;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const { run, pending, error } = useAction({ refresh: false });

  async function handleToggle(checked: boolean) {
    setEnabled(checked);
    await run(() => setMarketNewsletterOptIn(checked));
  }

  return (
    <div className={className}>
      <Label className="text-muted-foreground flex items-center gap-2 text-sm font-normal">
        <Tooltip content={DESCRIPTION}>
          <span className="flex items-center gap-1">
            Marktplatz-Newsletter
            <Info className="size-3.5" />
          </span>
        </Tooltip>
        <Switch
          checked={enabled}
          disabled={pending}
          onCheckedChange={handleToggle}
        />
      </Label>
      {error && <p className="text-destructive mt-1 text-xs">{error}</p>}
    </div>
  );
}
