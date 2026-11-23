import { PageHeading } from "@/components/ui/page-heading";
import { PageContainer } from "@/components/ui/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "@/components/ui/stat-tile";
import { FilterPill } from "@/components/ui/filter-pill";
import { BarRow } from "@/components/ui/bar-row";
import { formatDateShort } from "@/lib/utils/format";
import {
  ANALYTICS_WINDOWS,
  sharePercent,
  type AnalyticsOverview,
  type DailyCount,
  type LabelCount,
} from "@/lib/analytics/queries";
import { DEVICE } from "@/lib/analytics/collect";

const NUMBER = new Intl.NumberFormat("de-DE");
const AVERAGE = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });

/** Tagesschlüssel "2026-10-03" → "03.10." (Mittag UTC: kein Tagessprung). */
function dayLabel(day: string) {
  return formatDateShort(`${day}T12:00:00Z`);
}

function DailyChart({ daily }: { daily: DailyCount[] }) {
  const max = Math.max(1, ...daily.map((entry) => entry.count));
  const summary = daily
    .map((entry) => `${dayLabel(entry.day)}: ${entry.count}`)
    .join(", ");

  return (
    <div className="flex flex-col gap-2">
      <div
        role="img"
        aria-label={`Seitenaufrufe pro Tag — ${summary}`}
        className="flex h-40 items-end gap-px"
      >
        {daily.map((entry) => (
          <div
            key={entry.day}
            title={`${dayLabel(entry.day)}: ${NUMBER.format(entry.count)}`}
            className="bg-primary/80 hover:bg-primary min-h-px flex-1 rounded-t-sm transition-colors"
            style={{ height: `${(entry.count / max) * 100}%` }}
          />
        ))}
      </div>
      <div className="text-muted-foreground flex justify-between text-xs">
        <span>{daily.length > 0 && dayLabel(daily[0].day)}</span>
        <span>max. {NUMBER.format(max)} pro Tag</span>
        <span>{daily.length > 0 && dayLabel(daily[daily.length - 1].day)}</span>
      </div>
    </div>
  );
}

function RankingCard({
  title,
  rows,
  total,
  emptyText,
}: {
  title: string;
  rows: LabelCount[];
  /** Gesetzt → Werte zusätzlich als Anteil in Prozent anzeigen. */
  total?: number;
  emptyText: string;
}) {
  const max = Math.max(1, ...rows.map((row) => row.count));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {rows.length === 0 && (
          <p className="text-muted-foreground text-sm">{emptyText}</p>
        )}
        {rows.map((row) => (
          <BarRow
            key={row.label}
            label={row.label}
            value={row.count}
            max={max}
            valueLabel={
              total === undefined
                ? NUMBER.format(row.count)
                : `${NUMBER.format(row.count)} (${sharePercent(row.count, total)} %)`
            }
          />
        ))}
      </CardContent>
    </Card>
  );
}

export function AdminAnalyticsView({
  overview,
}: {
  overview: AnalyticsOverview;
}) {
  const { days, total, daily, topPaths, topReferrers, devices, browsers } =
    overview;
  const mobile = devices.find((row) => row.label === DEVICE.mobile)?.count ?? 0;
  const noData = "Im Zeitraum noch keine Seitenaufrufe erfasst.";

  return (
    <PageContainer className="gap-6">
      <PageHeading
        eyebrow="Administration"
        title="Seitenaufrufe"
        description="Selbst gehostetes, anonymes Tracking: nur Pfad, externe Herkunftsseite und grobe Browser-/Geräteklasse — keine IP-Adressen, keine Cookies, keine Wiedererkennung von Besuchern. Bots und Besucher mit „Do Not Track“ werden nicht gezählt."
        action={
          <div className="flex gap-2">
            {ANALYTICS_WINDOWS.map((option) => (
              <FilterPill
                key={option}
                label={`${option} Tage`}
                href={`/admin/analytics?tage=${option}`}
                active={option === days}
              />
            ))}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Seitenaufrufe"
          value={NUMBER.format(total)}
          hint={`letzte ${days} Tage`}
        />
        <StatTile label="Ø pro Tag" value={AVERAGE.format(total / days)} />
        <StatTile
          label="Mobil-Anteil"
          value={`${sharePercent(mobile, total)} %`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Verlauf</CardTitle>
        </CardHeader>
        <CardContent>
          <DailyChart daily={daily} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <RankingCard
          title="Meistbesuchte Seiten"
          rows={topPaths}
          emptyText={noData}
        />
        <RankingCard
          title="Herkunft (externe Seiten)"
          rows={topReferrers}
          emptyText="Keine Aufrufe über externe Links im Zeitraum."
        />
        <RankingCard
          title="Geräte"
          rows={devices}
          total={total}
          emptyText={noData}
        />
        <RankingCard
          title="Browser"
          rows={browsers}
          total={total}
          emptyText={noData}
        />
      </div>
    </PageContainer>
  );
}
