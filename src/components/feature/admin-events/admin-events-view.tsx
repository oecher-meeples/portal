"use client";

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
import { EventDialog } from "@/components/feature/admin-events/event-dialog";
import { deleteEvent } from "@/components/feature/admin-events/actions";
import {
  HelperRoleManagementSection,
  type HelperRoleRow,
  type PermissionOption,
} from "@/components/feature/admin-events/helper-role-management-section";
import { EventVisibilityPill } from "@/components/entities/event-visibility-pill";
import { formatDateRange } from "@/lib/utils/format";

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

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Event-Betrieb"
        title="Events & Schichten"
        description="Spieletage und Großveranstaltungen — losgelöst vom Kalender-Feed, Grundlage für Schichten, Erklärbären und Flohmarkt-Artikel."
        action={<EventDialog />}
      />

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
            {events.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-muted-foreground text-center"
                >
                  Noch keine Events angelegt.
                </TableCell>
              </TableRow>
            ) : (
              events.map((event) => (
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
