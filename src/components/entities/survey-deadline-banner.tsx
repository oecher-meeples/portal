import { CalendarClock } from "lucide-react";
import { getSurveyDeadlineMessage } from "@/lib/content/survey";

/** Deadline-Hinweisbanner für einen `UMFRAGE`-Post (#2) — drei Zustände je
 * nach `deadline`, kein Banner ohne gesetzte Deadline. */
export function SurveyDeadlineBanner({ deadline }: { deadline?: string }) {
  const message = getSurveyDeadlineMessage(deadline);
  if (!message) return null;

  return (
    <div className="bg-muted text-muted-foreground flex items-center gap-2 rounded-md px-3 py-2 text-sm">
      <CalendarClock className="size-4 shrink-0" />
      {message}
    </div>
  );
}
