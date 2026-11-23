/** Warning stage for a storage fill level. How each stage *looks* (colour)
 * is a display concern and lives in `components/entities/*` instead. */
export type StorageTone = "ok" | "warning" | "critical";

/** Pure threshold rule: ok below 75%, warning 75–89%, critical from 90% —
 * shared by every storage usage card (Blob, Neon, …) instead of each
 * defining its own copy (#240). */
export function getStorageTone(percent: number): StorageTone {
  if (percent >= 90) return "critical";
  if (percent >= 75) return "warning";
  return "ok";
}
