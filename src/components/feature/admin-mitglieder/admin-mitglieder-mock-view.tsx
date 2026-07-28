import { PageHeading } from "@/components/ui/page-heading";
import { Button } from "@/components/ui/button";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Member, MemberStatus } from "@/data/members";

const STATUS_LABELS: Record<MemberStatus, string> = {
  aktiv: "aktiv",
  einladung: "Einladung gesendet",
  ausgetreten: "ausgetreten",
};

const STATUS_TONE: Record<MemberStatus, StatusTone> = {
  aktiv: "positive",
  einladung: "warning",
  ausgetreten: "neutral",
};

type AdminMitgliederMockViewProps = {
  stats: { total: number; openInvitations: number };
  members: Member[];
};

export function AdminMitgliederMockView({
  stats,
  members,
}: AdminMitgliederMockViewProps) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Onboarding"
        title="Mitglieder & Einladungen"
        description="Geschlossenes Registrierungssystem: Admin legt ein Meeple an, das System versendet einen Einladungs-Token per E-Mail."
        action={<Button>+ Meeple anlegen &amp; einladen</Button>}
      />

      <div className="flex flex-wrap gap-2 text-sm">
        <span className="bg-primary text-primary-foreground rounded-full px-3 py-1 font-medium">
          Alle ({stats.total})
        </span>
        <span className="text-muted-foreground rounded-full border px-3 py-1">
          Einladung offen ({stats.openInvitations})
        </span>
        <span className="text-muted-foreground rounded-full border px-3 py-1">
          Ausgetreten
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Mitglied</TableHead>
              <TableHead>Rolle</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Beigetreten</TableHead>
              <TableHead className="text-right"> </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <span className="bg-muted flex size-7 items-center justify-center rounded-full font-semibold">
                      {member.initial}
                    </span>
                    <span
                      className={
                        member.anonymized
                          ? "text-muted-foreground"
                          : "font-medium"
                      }
                    >
                      {member.name}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {member.anonymized ? "â€”" : member.role}
                </TableCell>
                <TableCell>
                  <StatusPill
                    label={STATUS_LABELS[member.status]}
                    tone={STATUS_TONE[member.status]}
                  />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {member.joined}
                </TableCell>
                <TableCell className="text-right">
                  {member.status === "einladung" ? (
                    <Button variant="outline" size="sm">
                      Token erneut senden
                    </Button>
                  ) : member.status === "ausgetreten" ? (
                    <span className="text-muted-foreground text-sm">
                      Historie erhalten
                    </span>
                  ) : (
                    <Button variant="ghost" size="sm">
                      Verwalten
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
