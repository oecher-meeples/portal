import type { BulkInviteResult } from "@/components/feature/admin-mitglieder/invite-actions";

/** Ergebnis eines Sammelversands — geteilt von der CSV-Bulk-Einladung
 * (#265) und „Alle Fehlenden einladen" (#622). */
export function BulkInviteSummary({ summary }: { summary: BulkInviteResult }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm">{summary.created} Einladung(en) erstellt.</p>
      {summary.errors.length > 0 && (
        <ul className="text-destructive text-sm">
          {summary.errors.map((error) => (
            <li key={error.email}>
              {error.email}: {error.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
