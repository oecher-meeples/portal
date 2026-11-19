/**
 * Die drei „nicht vollständig spielbar"-Zustände im Prüfbogen (#273) —
 * jeweils eigenes Label als Präfix im freien `condition`-Text, da das
 * Datenmodell keine eigene Spielbarkeits-Spalte hat (bewusst kein
 * Schema-Zuwachs für reine UI-Kategorien). Rein und ohne Server-Abhängigkeit,
 * damit der Prüfbogen die Labels auch im Client nutzen kann.
 */
export const GAME_ISSUE_LABELS = {
  unvollstaendig: "Unvollständig spielbar",
  nicht_spielbar: "Nicht spielbar",
  beschaedigt: "Beschädigt",
} as const;

export type GameIssueKind = keyof typeof GAME_ISSUE_LABELS;

export const GAME_ISSUE_KINDS = Object.keys(
  GAME_ISSUE_LABELS,
) as GameIssueKind[];

/** `kind` kommt vom Client — ein Server-Action-Argument ist nie durch den
 * TypeScript-Typ geschützt. */
export function isGameIssueKind(value: unknown): value is GameIssueKind {
  return typeof value === "string" && Object.hasOwn(GAME_ISSUE_LABELS, value);
}

/** Das persistierte `condition`-Format: „<Label>: <Notiz>". */
export function formatDefectCondition(kind: GameIssueKind, note: string) {
  return `${GAME_ISSUE_LABELS[kind]}: ${note.trim()}`;
}
