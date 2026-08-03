import { PageHeading } from "@/components/ui/page-heading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  MostBorrowedGame,
  WeekdayCount,
} from "@/lib/statistics/loan-stats";

const WEEKDAY_LABELS = [
  "Sonntag",
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
];

export function StatistikenView({
  mostBorrowed,
  weekdays,
}: {
  mostBorrowed: MostBorrowedGame[];
  weekdays: WeekdayCount[];
}) {
  const maxWeekdayCount = Math.max(1, ...weekdays.map((d) => d.count));
  const maxBorrowCount = Math.max(1, ...mostBorrowed.map((g) => g.count));

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Anonymisiert"
        title="Statistiken"
        description="Reine Zählwerte über den Vereinsbestand — keine Namen, keine einzelnen Ausleihvorgänge."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Beliebteste Spiele</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {mostBorrowed.length === 0 && (
              <p className="text-muted-foreground text-sm">
                Noch keine Ausleihen erfasst.
              </p>
            )}
            {mostBorrowed.map((game) => (
              <div key={game.boardGameId} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium">{game.title}</span>
                  <span className="text-muted-foreground">{game.count}×</span>
                </div>
                <div className="bg-muted h-2 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full"
                    style={{
                      width: `${(game.count / maxBorrowCount) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aktivste Ausleihtage</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {weekdays.map((day) => (
              <div key={day.weekday} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium">
                    {WEEKDAY_LABELS[day.weekday]}
                  </span>
                  <span className="text-muted-foreground">{day.count}×</span>
                </div>
                <div className="bg-muted h-2 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full"
                    style={{
                      width: `${(day.count / maxWeekdayCount) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
