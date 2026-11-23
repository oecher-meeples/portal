/**
 * Deterministic categorical palette for helper rectangles in the
 * Schichtplan-Editor (#158) — same Meeple always gets the same color, both
 * in the pool bar and once assigned in the calendar (#159), across separate
 * renders (server-rendered pool vs. client-rendered assignments). Same
 * "bg-{hue}-500 with 15% opacity" + "text-{hue}-700, dark:text-{hue}-400"
 * convention as StatusPill, so every entry stays legible in both themes.
 */
const HELPER_COLORS = [
  "bg-rose-500/15 text-rose-700 dark:text-rose-400",
  "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-400",
  "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  "bg-teal-500/15 text-teal-700 dark:text-teal-400",
] as const;

/** Simple, stable string hash (djb2) — no crypto needed, just consistency. */
function hashString(value: string): number {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return hash >>> 0;
}

export function helperColorClass(meepleId: string): string {
  return HELPER_COLORS[hashString(meepleId) % HELPER_COLORS.length];
}
