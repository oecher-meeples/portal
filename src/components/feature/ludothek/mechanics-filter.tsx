"use client";

import { useRouter } from "next/navigation";
import { MultiSelectCombobox } from "@/components/ui/multi-select-combobox";
import { buildHref } from "@/lib/utils/query-string";

export function MechanicsFilter({
  basePath,
  rawSearchParams,
  options,
  selected,
}: {
  basePath: string;
  rawSearchParams: Record<string, string | string[] | undefined>;
  options: string[];
  selected: string[];
}) {
  const router = useRouter();

  return (
    <MultiSelectCombobox
      id="mechanik-filter"
      options={options}
      value={selected}
      onValueChange={(next) => {
        router.push(
          buildHref(basePath, rawSearchParams, {
            mechanik: next.length > 0 ? next : undefined,
          }),
        );
      }}
      placeholder="Mechanik suchen …"
      emptyLabel="Keine passende Mechanik"
    />
  );
}
