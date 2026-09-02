/**
 * Text für das Deadline-Hinweisbanner eines `UMFRAGE`-Posts (#2) — drei
 * Zustände je nachdem, wie `deadline` (YYYY-MM-DD) zu `now` liegt. `null`
 * ohne gesetzte Deadline: kein Banner.
 */
export function getSurveyDeadlineMessage(
  deadline: string | undefined,
  now = new Date(),
): string | null {
  if (!deadline) return null;

  const today = now.toISOString().slice(0, 10);
  const daysLeft = Math.round(
    (new Date(deadline).getTime() - new Date(today).getTime()) /
      (24 * 60 * 60 * 1000),
  );

  if (daysLeft < 0) {
    return "Umfrage beendet. Antworten werden unter Umständen nicht mehr berücksichtigt.";
  }
  if (daysLeft === 0) {
    return "Umfrage endet heute";
  }
  return `Umfrage noch ${daysLeft} ${daysLeft === 1 ? "Tag" : "Tage"} verfügbar`;
}
