/** Falls back through whatever identifies a Member when its own name fields
 * are still empty (#328: `lastName`/`firstName` are new territory, nullable,
 * not backfilled) — the linked Meeple's display name, then the email, then
 * (since #373: a MiniMeeple has neither a name nor an email yet) the
 * `memberNumber`. Shared by every place that shows a `Member` row to a human
 * (bank export, Ludothek Vereinsmitglied-Picker, admin-bestand's
 * Umbuchen-Ziel, Guardian-Verwaltung), so this fallback chain lives in
 * exactly one place. */
export function memberDisplayName(member: {
  lastName: string | null;
  firstName: string | null;
  email: string | null;
  meeple: { displayName: string } | null;
  memberNumber?: number;
}): string {
  const fullName = [member.firstName, member.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return (
    fullName ||
    member.meeple?.displayName ||
    member.email ||
    (member.memberNumber !== undefined
      ? `Mitglied Nr. ${member.memberNumber}`
      : "Unbekanntes Mitglied")
  );
}
