import { MeepleAvatar } from "@/components/entities/meeple-avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { HelperOverviewGroup } from "@/lib/events/helper-overview";
import { formatWeekdayDate } from "@/lib/utils/format";
import {
  formatMinutesAsTime,
  minutesSinceMidnight,
} from "@/lib/utils/time-of-day";

/** Übersicht aller gemeldeten Helfer-Verfügbarkeiten eines Events (#692). */
export function HelperOverviewSection({
  groups,
}: {
  groups: HelperOverviewGroup[];
}) {
  if (groups.length === 0) {
    return (
      <p className="text-muted-foreground pb-3 text-sm">
        Noch keine Verfügbarkeit gemeldet.
      </p>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Helfer</TableHead>
            <TableHead>Tag</TableHead>
            <TableHead>Von</TableHead>
            <TableHead>Bis</TableHead>
            <TableHead>Rollen</TableHead>
            <TableHead className="text-right">Auslastung</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.flatMap((group) =>
            group.rows.map((row, index) => (
              <TableRow key={`${group.meepleId}-${row.dayDate}`}>
                {index === 0 && (
                  <TableCell rowSpan={group.rows.length}>
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      <MeepleAvatar
                        name={group.displayName}
                        profilePictureUrl={group.profilePictureUrl}
                        profilePictureVisibility={
                          group.profilePictureVisibility
                        }
                        viewer={{ kind: "meeple" }}
                        size="sm"
                      />
                      {group.displayName}
                    </span>
                  </TableCell>
                )}
                <TableCell>{formatWeekdayDate(row.dayDate)}</TableCell>
                <TableCell className="font-mono text-sm">
                  {formatMinutesAsTime(minutesSinceMidnight(row.startsAt))}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {formatMinutesAsTime(minutesSinceMidnight(row.endsAt))}
                </TableCell>
                <TableCell>{row.roleNames.join(", ")}</TableCell>
                <TableCell className="text-right">
                  {row.utilizationPercent} %
                </TableCell>
              </TableRow>
            )),
          )}
        </TableBody>
      </Table>
    </div>
  );
}
