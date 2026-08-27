"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { EventVisibility } from "@prisma/client";
import { PageHeading } from "@/components/ui/page-heading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowRight, Trash2 } from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { TextField, Field } from "@/components/ui/field";
import { PillToggle, type PillOption } from "@/components/ui/pill-toggle";
import { EventDialog } from "@/components/feature/admin-events/event-dialog";
import { deleteEvent } from "@/components/feature/admin-events/actions";
import {
  HelperRoleManagementSection,
  type HelperRoleRow,
  type PermissionOption,
} from "@/components/feature/admin-events/helper-role-management-section";
import { EventVisibilityPill } from "@/components/entities/event-visibility-pill";
import { EVENT_VISIBILITY_LABELS } from "@/lib/events/visibility";
import { formatDateRange } from "@/lib/utils/format";

type VisibilityFilter = EventVisibility | "alle";

const VISIBILITY_FILTER_OPTIONS: PillOption<VisibilityFilter>[] = [
  { label: "Alle", value: "alle" },
  ...(
    Object.entries(EVENT_VISIBILITY_LABELS) as [EventVisibility, string][]
  ).map(([value, label]) => ({ label, value })),
];

export type EventRow = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  helpersWanted: boolean;
  visibility: EventVisibility;
  shiftCount: number;
};

export function AdminEventsView({
  events,
  helperRoles,
  permissions,
}: {
  events: EventRow[];
  helperRoles: HelperRoleRow[];
  permissions: PermissionOption[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [visibilityFilter, setVisibilityFilter] =
    useState<VisibilityFilter>("alle");
  const [yearFilter, setYearFilter] = useState("alle");

  const years = [
    ...new Set(events.map((event) => new Date(event.startsAt).getFullYear())),
  ].sort((a, b) => b - a);

  const filteredEvents = events
    .filter((event) =>
      event.title.toLowerCase().includes(search.trim().toLowerCase()),
    )
    .filter(
      (event) =>
        visibilityFilter === "alle" || event.visibility === visibilityFilter,
    )
    .filter(
      (event) =>
        yearFilter === "alle" ||
        String(new Date(event.startsAt).getFullYear()) === yearFilter,
    );

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Event-Betrieb"
        title="Events & Schichten"
        description="Spieletage und Großveranstaltungen — losgelöst vom Kalender-Feed, Grundlage für Schichten, Erklärbären und Flohmarkt-Artikel."
        action={<EventDialog />}
      />

      <div className="flex flex-wrap items-end gap-3">
        <TextField
          id="event-search"
          label="Suche"
          type="search"
          placeholder="Suche nach Titel…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onClear={() => setSearch("")}
          fieldClassName="w-64"
        />
        <Field label="Jahr" htmlFor="event-year-filter">
          <select
            id="event-year-filter"
            className="border-input bg-background h-9 rounded-md border px-3 text-sm"
            value={yearFilter}
            onChange={(event) => setYearFilter(event.target.value)}
          >
            <option value="alle">Alle</option>
            {years.map((year) => (
              <option key={year} value={String(year)}>
                {year}
              </option>
            ))}
          </select>
        </Field>
        <PillToggle
          options={VISIBILITY_FILTER_OPTIONS}
          value={visibilityFilter}
          onChange={setVisibilityFilter}
        />
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Titel</TableHead>
              <TableHead>Zeitraum</TableHead>
              <TableHead>Ort</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Schichten</TableHead>
              <TableHead />
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEvents.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-muted-foreground text-center"
                >
                  {events.length === 0
                    ? "Noch keine Events angelegt."
                    : "Keine Events gefunden."}
                </TableCell>
              </TableRow>
            ) : (
              filteredEvents.map((event) => (
                <TableRow
                  key={event.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/admin/events/${event.id}`)}
                >
                  <TableCell>{event.title}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateRange(event.startsAt, event.endsAt)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {event.location ?? "—"}
                  </TableCell>
                  <TableCell>
                    <EventVisibilityPill visibility={event.visibility} />
                  </TableCell>
                  <TableCell>{event.shiftCount}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      render={
                        <Link href={`/admin/events/${event.id}`}>
                          <ArrowRight className="size-4" />
                          Öffnen
                        </Link>
                      }
                    />
                  </TableCell>
                  <TableCell
                    className="text-right"
                    onClick={(clickEvent) => clickEvent.stopPropagation()}
                  >
                    <ActionButton
                      variant="destructive"
                      size="sm"
                      className="gap-1.5"
                      aria-label="Event löschen"
                      confirm={`Event "${event.title}" wirklich löschen?`}
                      action={deleteEvent.bind(null, event.id)}
                    >
                      <Trash2 className="size-4" />
                      Löschen
                    </ActionButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <HelperRoleManagementSection
        roles={helperRoles}
        permissions={permissions}
      />
    </div>
  );
}
