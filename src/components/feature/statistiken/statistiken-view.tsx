import { PageHeading } from "@/components/ui/page-heading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer } from "@/components/ui/page-container";
import { BarRow } from "@/components/ui/bar-row";
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
      </div>
    </PageContainer>
  );
}
