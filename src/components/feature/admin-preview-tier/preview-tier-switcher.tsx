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

export function PreviewTierSwitcher({
  tier,
  className,
  labelClassName = "hidden lg:inline",
}: {
  tier: Tier;
  /** Default: nur ab `md` sichtbar (Header). MobileNav (#437-Folge) braucht
   * ihn dagegen immer sichtbar, da die Bottom-Bar dort bereits `< sm` ist. */
  className?: string;
  /** Default: zwischen `md` und `lg` ausgeblendet — im Header ist genau
   * dieser Bereich manchmal zu knapp für Label+Pills nebeneinander (führte
   * sonst zu abgeschnittenem Text statt sauberem Verschwinden). MobileNav
   * hat immer genug Platz und überschreibt auf dauerhaft sichtbar. */
  labelClassName?: string;
}) {
  const [value, setValue] = useState(tier);
  const { run, pending } = useAction();

  function handleChange(next: Tier) {
    setValue(next);
    run(() => setPreviewTier(next));
  }

  return (
    <div
      className={cn(
        "hidden items-center justify-end gap-2 overflow-hidden md:flex",
        pending && "opacity-60",
        className,
      )}
    >
      {/* Kein Zeilenumbruch (kein `flex-wrap`) — bei zu wenig Platz wird das
          Label über `labelClassName` komplett ausgeblendet statt
          abgeschnitten; die Pills selbst schrumpfen zusätzlich über
          `compact` (clamp()-Min/Max) minimal mit. */}
      <span
        className={cn(
          "text-muted-foreground text-xs font-semibold tracking-wider whitespace-nowrap uppercase",
          labelClassName,
        )}
      >
        Ansicht
      </span>
      <PillToggle
        options={OPTIONS}
        value={value}
        onChange={handleChange}
        compact
      />
    </div>
  );
}
