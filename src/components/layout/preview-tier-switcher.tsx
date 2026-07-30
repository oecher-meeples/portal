"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PillToggle } from "@/components/ui/pill-toggle";
import { setPreviewTier } from "@/components/layout/preview-tier-actions";
import type { Tier } from "@/lib/nav-config";

const OPTIONS: { label: string; value: Tier }[] = [
  { label: "Gast", value: "gast" },
  { label: "Mitglied", value: "mitglied" },
  { label: "Admin", value: "admin" },
];

export function PreviewTierSwitcher({ tier }: { tier: Tier }) {
  const router = useRouter();
  const [value, setValue] = useState(tier);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: Tier) {
    setValue(next);
    startTransition(async () => {
      await setPreviewTier(next);
      router.refresh();
    });
  }

  return (
    <div
      className={`hidden items-center gap-2 md:flex ${isPending ? "opacity-60" : ""}`}
    >
      <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
        Ansicht
      </span>
      <PillToggle options={OPTIONS} value={value} onChange={handleChange} />
    </div>
  );
}
