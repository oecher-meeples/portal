"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/native-select";
import { Pagination } from "@/components/ui/pagination";
import { usePagination } from "@/components/ui/use-pagination";
import { MeepleAvatar } from "@/components/entities/meeple-avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  averageBookedMinutes,
  averageBookedMinutesPerHelper,
  filterOverviewGroups,
  OVERVIEW_PAGE_ROWS,
  overviewFilterOptions,
  paginateOverviewGroups,
  totalBookedMinutes,
  formatHoursLabel,
  formatUtilization,
  utilizationColor,
  type HelperOverviewGroup,
} from "@/lib/events/helper-overview";
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
  const [dayFilter, setDayFilter] = useState("alle");
  const [roleFilter, setRoleFilter] = useState("alle");
  const [search, setSearch] = useState("");
  const options = useMemo(() => overviewFilterOptions(groups), [groups]);
  const pages = useMemo(
    () =>
      paginateOverviewGroups(
        filterOverviewGroups(groups, {
          dayDate: dayFilter === "alle" ? null : dayFilter,
          roleName: roleFilter === "alle" ? null : roleFilter,
          query: search,
        }),
      ),
    [groups, dayFilter, roleFilter, search],
  );
  const { page, pageCount, setPage } = usePagination(pages.length, 1);
  const pageGroups = pages[page] ?? [];
  const entryCount = pages.reduce(
    (sum, p) => sum + p.reduce((n, g) => n + g.rows.length, 0),
    0,
  );
  const helperCount = pages.reduce((sum, p) => sum + p.length, 0);
  // Die Punktfarbe hinter dem Namen bezieht sich immer auf alle Tage, nicht
  // auf die gefilterten Zeilen.
  const totalByHelper = new Map(
    groups.map((group) => [group.helperId, totalBookedMinutes(group)]),
  );

  if (groups.length === 0) {
    return (
      <p className="text-muted-foreground pb-3 text-sm">
        Noch keine Verfügbarkeit gemeldet.
      </p>
    );
  }
  const average = averageBookedMinutes(groups);
  const averagePerHelper = averageBookedMinutesPerHelper(groups);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm">
        <span className="text-muted-foreground">
          Ø gebuchte Stunden je Helfer (gesamtes Event):{" "}
        </span>
        <span className="font-medium">
          {formatHoursLabel(averagePerHelper)}
        </span>
        <span className="text-muted-foreground"> · je Helfer und Tag: </span>
        <span className="font-medium">{formatHoursLabel(average)}</span>
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Suche" htmlFor="helper-overview-search">
          <Input
            id="helper-overview-search"
            type="search"
            placeholder="Name"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </Field>
        <Field label="Tag" htmlFor="helper-overview-filter-day">
          <NativeSelect
            id="helper-overview-filter-day"
            size="md"
            value={dayFilter}
            onChange={(event) => setDayFilter(event.target.value)}
          >
            <option value="alle">Alle</option>
            {options.days.map((day) => (
              <option key={day} value={day}>
                {formatWeekdayDate(day)}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Rolle" htmlFor="helper-overview-filter-role">
          <NativeSelect
            id="helper-overview-filter-role"
            size="md"
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
          >
            <option value="alle">Alle</option>
            {options.roles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
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
            {pageGroups.flatMap((group) =>
              group.rows.map((row, index) => (
                <TableRow key={`${group.helperId}-${row.dayDate}`}>
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
                        <span
                          role="img"
                          aria-label={`${formatHoursLabel(totalByHelper.get(group.helperId) ?? 0)} gebucht (Ø ${formatHoursLabel(averagePerHelper)} je Helfer)`}
                          title={`${formatHoursLabel(totalByHelper.get(group.helperId) ?? 0)} gebucht über alle Tage (Ø ${formatHoursLabel(averagePerHelper)} je Helfer)`}
                          className="size-2.5 rounded-full"
                          style={{
                            backgroundColor: utilizationColor(
                              totalByHelper.get(group.helperId) ?? 0,
                              averagePerHelper,
                            ),
                          }}
                        />
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
                    <span className="inline-flex items-center justify-end gap-2">
                      <span
                        aria-hidden
                        className="size-2.5 rounded-full"
                        style={{
                          backgroundColor: utilizationColor(
                            row.bookedMinutes,
                            average,
                          ),
                        }}
                      />
                      {formatUtilization(row)}
                    </span>
                  </TableCell>
                </TableRow>
              )),
            )}
          </TableBody>
        </Table>
      </div>
      {entryCount === 0 && (
        <p className="text-muted-foreground text-sm">
          Keine Einträge für diese Filter.
        </p>
      )}
      <p className="text-muted-foreground text-sm">
        {helperCount} Helfer · {entryCount} Helfertage
      </p>
      <Pagination
        page={page}
        pageCount={pageCount}
        onPageChange={setPage}
        pageSize={OVERVIEW_PAGE_ROWS}
        onPageSizeChange={() => {}}
        totalItems={entryCount}
        showPageSize={false}
      />
    </div>
  );
}
