import { PageHeading } from "@/components/ui/page-heading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer } from "@/components/ui/page-container";
import type {
  MostBorrowedGame,
  WeekdayCount,
} from "@/lib/statistics/loan-stats";
import type { InventoryCounts } from "@/lib/statistics/inventory-stats";

const WEEKDAY_LABELS = [
  "Sonntag",
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
];

function InventoryCountRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-sm">
      <span className="font-medium">{label}</span>
      <span className="text-muted-foreground">{value}</span>
    </div>
  );
}

function InventoryCountCard({
  title,
  unit,
  counts,
}: {
  title: string;
  unit: string;
  counts: InventoryCounts;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <InventoryCountRow label="Im Verein" value={counts.club} />
        <InventoryCountRow label="Im Privatbesitz" value={counts.private} />
        <InventoryCountRow
          label={`${unit} insgesamt verfügbar`}
          value={counts.total}
        />
      </CardContent>
    </Card>
  );
}

export function StatistikenView({
  mostBorrowed,
  weekdays,
  titleCounts,
  copyCounts,
}: {
  mostBorrowed: MostBorrowedGame[];
  weekdays: WeekdayCount[];
  titleCounts: InventoryCounts;
  copyCounts: InventoryCounts;
}) {
  const maxWeekdayCount = Math.max(1, ...weekdays.map((d) => d.count));
  const maxBorrowCount = Math.max(1, ...mostBorrowed.map((g) => g.count));

  return (
    <PageContainer className="gap-6">
      <PageHeading
        eyebrow="Anonymisiert"
        title="Statistiken"
        description="Reine Zählwerte über den Vereinsbestand — keine Namen, keine einzelnen Ausleihvorgänge."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <InventoryCountCard
          title="Spieletitel"
          unit="Titel"
          counts={titleCounts}
        />
        <InventoryCountCard
          title="Exemplare"
          unit="Exemplare"
          counts={copyCounts}
        />

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
    </PageContainer>
  );
}
