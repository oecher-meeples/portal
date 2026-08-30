/** Falls back through whatever identifies a Member when its own name fields
 * are still empty (#328: `lastName`/`firstName` are new territory, nullable,
 * not backfilled) — the linked Meeple's display name, then the email. Shared
 * by every place that shows a `Member` row to a human (bank export, Ludothek
 * Vereinsmitglied-Picker, admin-bestand's Umbuchen-Ziel), so this fallback
 * chain lives in exactly one place. */
export function memberDisplayName(member: {
  lastName: string | null;
  firstName: string | null;
  email: string;
  meeple: { displayName: string } | null;
}): string {
  const fullName = [member.firstName, member.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return fullName || member.meeple?.displayName || member.email;
}
