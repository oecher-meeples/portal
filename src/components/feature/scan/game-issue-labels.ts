/** Die drei "nicht vollständig spielbar"-Zustände im Prüfbogen (#273) —
 * jeweils eigenes Label als Präfix im freien `condition`-Text, da das
 * Datenmodell keine eigene Spielbarkeits-Spalte hat (bewusst kein
 * Schema-Zuwachs für reine UI-Kategorien). Kept out of `inventory-actions.ts`
 * because a `"use server"` file may only export async functions (#355). */
export type GameIssueKind = "unvollstaendig" | "nicht_spielbar" | "beschaedigt";

export const GAME_ISSUE_LABELS: Record<GameIssueKind, string> = {
  unvollstaendig: "Unvollständig spielbar",
  nicht_spielbar: "Nicht spielbar",
  beschaedigt: "Beschädigt",
};
