import { PageHeading } from "@/components/ui/page-heading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EventDialog } from "@/components/feature/admin-events/event-dialog";
import { DeleteEventButton } from "@/components/feature/admin-events/delete-event-button";

const dateTime = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "short",
  timeStyle: "short",
});

export type EventRow = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  shiftCount: number;
};

function formatTimeframe(startsAt: string, endsAt: string | null) {
  if (!endsAt) {
    return dateTime.format(new Date(startsAt));
  }
  return `${dateTime.format(new Date(startsAt))} – ${dateTime.format(new Date(endsAt))}`;
}

export function AdminEventsView({ events }: { events: EventRow[] }) {
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
                <TableCell colSpan={6} className="text-muted-foreground text-center">
                  Noch keine Events angelegt.
                </TableCell>
              </TableRow>
            ) : (
              events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>{event.title}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatTimeframe(event.startsAt, event.endsAt)}
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
                    <DeleteEventButton eventId={event.id} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
