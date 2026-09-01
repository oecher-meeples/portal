"use client";

import { useRouter } from "next/navigation";
import { MultiSelectCombobox } from "@/components/ui/multi-select-combobox";
import { buildHref } from "@/lib/utils/query-string";

/** Generischer Mehrfachauswahl-Filter fürs Ludothek-Filterpanel — von
 * Mechanik- und Kategorie-Filter geteilt (#404), sonst identischer Aufbau
 * bis auf URL-Parameter und Beschriftung. */
export function LudothekMultiSelectFilter({
  id,
  paramKey,
  basePath,
  rawSearchParams,
  options,
  selected,
  placeholder,
  emptyLabel,
}: {
  id: string;
  paramKey: string;
  basePath: string;
  rawSearchParams: Record<string, string | string[] | undefined>;
  options: string[];
  selected: string[];
  placeholder: string;
  emptyLabel: string;
}) {
  const router = useRouter();

  return (
    <MultiSelectCombobox
      id={id}
      options={options}
      value={selected}
      onValueChange={(next) => {
        router.push(
          buildHref(basePath, rawSearchParams, {
            [paramKey]: next.length > 0 ? next : undefined,
          }),
        );
      }}
      placeholder={placeholder}
      emptyLabel={emptyLabel}
    />
  );
}
