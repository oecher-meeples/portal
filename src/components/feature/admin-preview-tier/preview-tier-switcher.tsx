"use client";

import { useState } from "react";
import { PillToggle } from "@/components/ui/pill-toggle";
import { useAction } from "@/components/ui/use-action";
import { setPreviewTier } from "@/components/feature/admin-preview-tier/actions";
import type { Tier } from "@/lib/utils/nav-config";
import { cn } from "@/lib/utils/cn";

const OPTIONS: { label: string; value: Tier }[] = [
  { label: "Gast", value: "gast" },
  { label: "Mitglied", value: "mitglied" },
  { label: "Admin", value: "admin" },
];

export function PreviewTierSwitcher({ tier }: { tier: Tier }) {
  const [value, setValue] = useState(tier);
  const { run, pending } = useAction();

  function handleChange(next: Tier) {
    setValue(next);
    run(() => setPreviewTier(next));
  }

  return (
    <div
      className={cn(
        "hidden items-center gap-2 md:flex",
        pending && "opacity-60",
      )}
    >
      <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
        Ansicht
      </span>
      <PillToggle options={OPTIONS} value={value} onChange={handleChange} />
    </div>
  );
}
