import type { ContributionCategory } from "@/lib/members/contribution";

/** Toggles the contribution stat-tile filter (#340): clicking the already
 * active category clears it, clicking a different one replaces it. Kept in
 * its own dependency-free module so it's testable without dragging in
 * `admin-mitglieder-view.tsx`'s whole (heavy) import graph. */
export function nextContributionFilter(
  current: ContributionCategory[] | null,
  clicked: ContributionCategory[],
): ContributionCategory[] | null {
  return current && current.join(",") === clicked.join(",") ? null : clicked;
}

/** #432: das "Beitragsart"-Dropdown in `vereinsmitglieder-table.tsx` teilt
 * sich den State mit der Stat-Tile-Klick-Shortcut (#340) — beide setzen
 * dieselben `ContributionCategory[] | null`. "meeple" bündelt hier bewusst
 * `meeple` + `individuell` (Eigenbetrag), da beide in derselben
 * Stat-Tile-Zeile angezeigt werden. */
export type ContributionFilterOption = "alle" | "mini" | "jung" | "meeple";

export const CONTRIBUTION_FILTER_CATEGORIES: Record<
  Exclude<ContributionFilterOption, "alle">,
  ContributionCategory[]
> = {
  mini: ["mini"],
  jung: ["jung"],
  meeple: ["meeple", "individuell"],
};

/** Reverse-mapping für den Dropdown-Wert aus dem geteilten Filter-State. */
export function contributionFilterOption(
  categories: ContributionCategory[] | null,
): ContributionFilterOption {
  if (!categories) return "alle";
  const match = (
    Object.entries(CONTRIBUTION_FILTER_CATEGORIES) as [
      Exclude<ContributionFilterOption, "alle">,
      ContributionCategory[],
    ][]
  ).find(([, value]) => value.join(",") === categories.join(","));
  return match?.[0] ?? "alle";
}
