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
