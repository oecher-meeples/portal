export type LabelUnit = {
  id: string;
  code: string;
  label: string;
  kind: "BOX" | "SHELF";
};

export type LabelSelection = "all" | "boxes" | "shelves" | "selected";

const LABELS_PER_PAGE = 12;

/** Sorted by code so a printed sheet matches the order units are usually filed in. */
export function selectLabels(
  units: LabelUnit[],
  selection: LabelSelection,
  selectedIds: string[] = [],
) {
  const selectedSet = new Set(selectedIds);
  const filtered = units.filter((unit) => {
    if (selection === "boxes") return unit.kind === "BOX";
    if (selection === "shelves") return unit.kind === "SHELF";
    if (selection === "selected") return selectedSet.has(unit.id);
    return true;
  });

  return [...filtered].sort((a, b) => a.code.localeCompare(b.code));
}

export function paginateLabels(
  units: LabelUnit[],
  perPage: number = LABELS_PER_PAGE,
) {
  const pages: LabelUnit[][] = [];
  for (let i = 0; i < units.length; i += perPage) {
    pages.push(units.slice(i, i + perPage));
  }
  return pages;
}
