import { PageHeading } from "@/components/ui/page-heading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";
import { EventDialog } from "@/components/feature/admin-events/event-dialog";
import { deleteEvent } from "@/components/feature/admin-events/actions";
import {
  HelperRoleManagementSection,
  type HelperRoleRow,
  type PermissionOption,
} from "@/components/feature/admin-events/helper-role-management-section";
import { formatDateRange } from "@/lib/utils/format";

export type EventRow = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
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
              <TableHead>Schichten</TableHead>
              <TableHead />
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-muted-foreground text-center"
                >
                  Noch keine Events angelegt.
                </TableCell>
              </TableRow>
            ) : (
              events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>{event.title}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateRange(event.startsAt, event.endsAt)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {event.location ?? "—"}
                  </TableCell>
                  <TableCell>{event.shiftCount}</TableCell>
                  <TableCell className="text-right">
                    <EventDialog
                      event={{
                        id: event.id,
                        title: event.title,
                        startsAt: event.startsAt,
                        endsAt: event.endsAt,
                        location: event.location,
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <ActionButton
                      variant="destructive"
                      size="icon-sm"
                      aria-label="Event löschen"
                      confirm={`Event "${event.title}" wirklich löschen?`}
                      action={deleteEvent.bind(null, event.id)}
                    >
                      <Trash2 className="size-4" />
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
