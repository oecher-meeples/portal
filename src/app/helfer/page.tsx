import { ChevronDown } from "lucide-react";
import { requireMember } from "@/lib/session";
import { PageHeading } from "@/components/ui/page-heading";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  HELFER_EVENT,
  HELFER_SHIFTS,
  type ShiftStatus,
} from "@/data/helferplan";

const STATUS_TONE: Record<ShiftStatus, StatusTone> = {
  sicher: "positive",
  vorlaeufig: "warning",
  offen: "neutral",
  voll: "positive",
};

export default async function HelferPage() {
  await requireMember();

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Event-Betrieb"
        title={`Helferplan Â· ${HELFER_EVENT.title}`}
        description="Digitaler Schichtplan mit flexiblem Zusage-Status. Trag dich in offene Schichten ein."
      />
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Schicht</TableHead>
              <TableHead>Rolle</TableHead>
              <TableHead>Zeit</TableHead>
              <TableHead>Besetzt</TableHead>
              <TableHead className="text-right"> </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {HELFER_SHIFTS.map((shift) => (
              <TableRow key={shift.name}>
                <TableCell className="font-medium">{shift.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {shift.emoji} {shift.role}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {shift.time}
                </TableCell>
                <TableCell>
                  {shift.status === "voll" ? (
                    <StatusPill
                      label={`${shift.assigned}/${shift.capacity} Â· voll`}
                      tone="positive"
                    />
                  ) : shift.assignedToMe ? (
                    <StatusPill
                      label={`${shift.assigned}/${shift.capacity} Â· du dabei`}
                      tone={STATUS_TONE[shift.status]}
                    />
                  ) : (
                    <span className="text-sm">
                      {shift.assigned}/{shift.capacity}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {shift.status === "voll" ? (
                    <span className="text-muted-foreground">â€”</span>
                  ) : shift.assignedToMe ? (
                    <Button variant="outline" size="sm" className="gap-1">
                      VorlÃ¤ufig <ChevronDown className="size-3.5" />
                    </Button>
                  ) : (
                    <Button size="sm">Zusagen</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="bg-primary/10 rounded-md p-3 text-sm">
        Zusage-Status je Schicht: <strong>sicher</strong> (bestÃ¤tigt) oder{" "}
        <strong>vorlÃ¤ufig</strong> â€“ so behalten die Admins den Ãœberblick.
      </p>
    </div>
  );
}
