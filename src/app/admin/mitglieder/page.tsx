import { RoleGate } from "@/components/shared/role-gate";
import { PageHeading } from "@/components/shared/page-heading";
import { Button } from "@/components/ui/button";
import { StatusPill, type StatusTone } from "@/components/shared/status-pill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MEMBERS, MEMBER_STATS, type MemberStatus } from "@/data/members";

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

export default function AdminMitgliederPage() {
  return (
    <RoleGate minRole="admin">
      <div className="flex flex-col gap-6">
        <PageHeading
          eyebrow="Onboarding"
          title="Mitglieder & Einladungen"
          description="Geschlossenes Registrierungssystem: Admin legt ein Meeple an, das System versendet einen Einladungs-Token per E-Mail."
          action={<Button>+ Meeple anlegen &amp; einladen</Button>}
        />

        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-primary px-3 py-1 font-medium text-primary-foreground">
            Alle ({MEMBER_STATS.total})
          </span>
          <span className="rounded-full border px-3 py-1 text-muted-foreground">
            Einladung offen ({MEMBER_STATS.openInvitations})
          </span>
          <span className="rounded-full border px-3 py-1 text-muted-foreground">Ausgetreten</span>
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
              {MEMBERS.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-7 items-center justify-center rounded-full bg-muted font-semibold">
                        {member.initial}
                      </span>
                      <span className={member.anonymized ? "text-muted-foreground" : "font-medium"}>
                        {member.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {member.anonymized ? "—" : member.role}
                  </TableCell>
                  <TableCell>
                    <StatusPill label={STATUS_LABELS[member.status]} tone={STATUS_TONE[member.status]} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{member.joined}</TableCell>
                  <TableCell className="text-right">
                    {member.status === "einladung" ? (
                      <Button variant="outline" size="sm">
                        Token erneut senden
                      </Button>
                    ) : member.status === "ausgetreten" ? (
                      <span className="text-sm text-muted-foreground">Historie erhalten</span>
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
    </RoleGate>
  );
}
