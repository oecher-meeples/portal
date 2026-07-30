export type LfgStatus = "offen" | "voll" | "abgelaufen" | "geschlossen";

export function isLfgExpired(
  post: { plannedAt: Date | null },
  now: Date = new Date(),
) {
  return post.plannedAt !== null && post.plannedAt.getTime() < now.getTime();
}

export function getLfgStatus(
  post: {
    maxParticipants: number;
    plannedAt: Date | null;
    closedAt: Date | null;
  },
  participantCount: number,
  now: Date = new Date(),
): LfgStatus {
  if (post.closedAt) return "geschlossen";
  if (isLfgExpired(post, now)) return "abgelaufen";
  if (participantCount >= post.maxParticipants) return "voll";
  return "offen";
}
