import { PageHeading } from "@/components/ui/page-heading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer } from "@/components/ui/page-container";
import { BarRow } from "@/components/ui/bar-row";
import { ColumnChart } from "@/components/ui/column-chart";
import type { MonthCount } from "@/lib/statistics/check-stats";
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
  checksPerMonth,
}: {
  mostBorrowed: MostBorrowedGame[];
  weekdays: WeekdayCount[];
  titleCounts: InventoryCounts;
  copyCounts: InventoryCounts;
  checksPerMonth: MonthCount[];
}) {
  const hasChecks = checksPerMonth.some((month) => month.count > 0);
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
              <BarRow
                key={game.boardGameId}
                label={game.title}
                value={game.count}
                max={maxBorrowCount}
                valueLabel={`${game.count}×`}
              />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aktivste Ausleihtage</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {weekdays.map((day) => (
              <BarRow
                key={day.weekday}
                label={WEEKDAY_LABELS[day.weekday]}
                value={day.count}
                max={maxWeekdayCount}
                valueLabel={`${day.count}×`}
              />
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Exemplar-Kontrollen pro Monat</CardTitle>
          </CardHeader>
          <CardContent>
            {hasChecks ? (
              <ColumnChart
                caption="Exemplar-Kontrollen pro Monat, letzte 12 Monate"
                labelHeader="Monat"
                valueHeader="Kontrollen"
                items={checksPerMonth.map((month) => ({
                  key: month.key,
                  label: month.shortLabel,
                  srLabel: month.longLabel,
                  value: month.count,
                }))}
              />
            ) : (
              <p className="text-muted-foreground text-sm">
                Noch keine Kontrollen erfasst.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
