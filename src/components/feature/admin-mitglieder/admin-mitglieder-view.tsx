import { PageHeading } from "@/components/ui/page-heading";
import { StatTile } from "@/components/ui/stat-tile";
import { StatusPill } from "@/components/ui/status-pill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MEMBERSHIP_STATE_LABELS, MEMBERSHIP_STATE_TONES } from "@/lib/format";
import type { MembershipState } from "@/lib/meeples";
import { InviteForm } from "@/components/feature/admin-invites/invite-form";
import { AnonymiseMeepleDialog } from "@/components/feature/admin-mitglieder/anonymise-meeple-dialog";
import { ResignMembershipDialog } from "@/components/feature/admin-mitglieder/resign-membership-dialog";
import { RevokeResignationButton } from "@/components/feature/admin-mitglieder/revoke-resignation-button";

export type MeepleRow = {
  id: string;
  memberNumber: number;
  displayName: string;
  roles: string[];
  membershipState: MembershipState;
  joinedAt: string;
  resignedAt: string | null;
  membershipEndsAt: string | null;
  openGames: number;
  openUnits: number;
};

function germanDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("de-DE").format(new Date(value));
}

export function AdminMitgliederView({
  meeples,
  isDecemberOrLater,
}: {
  meeples: MeepleRow[];
  isDecemberOrLater: boolean;
}) {
  const withOpenHoldings = meeples.filter(
    (m) => m.membershipState === "gekuendigt" && (m.openGames > 0 || m.openUnits > 0),
  );
  const readyForAnonymisation = meeples.filter(
    (m) => m.membershipState === "ausgetreten" && m.openGames === 0 && m.openUnits === 0,
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Onboarding & Lebenszyklus"
        title="Mitglieder & Einladungen"
        description="Geschlossenes Registrierungssystem: eine Einladung ist ein Token ohne Personenbezug, der Meeple entsteht beim ersten Login."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Mitglieder" value={meeples.length} hint="insgesamt" />
        <StatTile
          label="Kündigungen mit Bestand"
          value={withOpenHoldings.length}
          hint={isDecemberOrLater ? "ab Dezember relevant" : undefined}
        />
        <StatTile
          label="Bereit zur Anonymisierung"
          value={readyForAnonymisation.length}
          hint="ausgetreten, ohne Bestand"
        />
      </div>

      {withOpenHoldings.length > 0 && (
        <div
          className={`bg-card rounded-lg border p-5 ${isDecemberOrLater ? "border-amber-500/50" : ""}`}
        >
          <h2 className="font-serif text-lg font-bold">
            Kündigungen mit offenen Beständen
          </h2>
          <ul className="mt-3 flex flex-col divide-y text-sm">
            {withOpenHoldings.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2">
                <span>{m.displayName}</span>
                <span className="text-muted-foreground">
                  {m.openGames} Spiele · {m.openUnits} Einheiten · Austritt{" "}
                  {germanDate(m.membershipEndsAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {readyForAnonymisation.length > 0 && (
        <div className="bg-card rounded-lg border p-5">
          <h2 className="font-serif text-lg font-bold">
            Bereit zur Anonymisierung
          </h2>
          <ul className="mt-3 flex flex-col divide-y text-sm">
            {readyForAnonymisation.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2">
                <span>{m.displayName}</span>
                <AnonymiseMeepleDialog meepleId={m.id} displayName={m.displayName} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Nr.</TableHead>
              <TableHead>Mitglied</TableHead>
              <TableHead>Rollen</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Beigetreten</TableHead>
              <TableHead>Kündigung / Austritt</TableHead>
              <TableHead className="text-right"> </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {meeples.map((meeple) => (
              <TableRow key={meeple.id}>
                <TableCell className="font-mono">{meeple.memberNumber}</TableCell>
                <TableCell
                  className={
                    meeple.membershipState === "anonymisiert"
                      ? "text-muted-foreground"
                      : "font-medium"
                  }
                >
                  {meeple.displayName}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {meeple.roles.length > 0 ? meeple.roles.join(", ") : "—"}
                </TableCell>
                <TableCell>
                  <StatusPill
                    label={MEMBERSHIP_STATE_LABELS[meeple.membershipState]}
                    tone={MEMBERSHIP_STATE_TONES[meeple.membershipState]}
                  />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {germanDate(meeple.joinedAt)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {meeple.resignedAt
                    ? `${germanDate(meeple.resignedAt)} → ${germanDate(meeple.membershipEndsAt)}`
                    : "—"}
                </TableCell>
                <TableCell className="text-right">
                  {meeple.membershipState === "anonymisiert" ? (
                    <span className="text-muted-foreground text-sm">
                      Historie erhalten
                    </span>
                  ) : meeple.resignedAt ? (
                    <RevokeResignationButton meepleId={meeple.id} />
                  ) : (
                    <ResignMembershipDialog
                      meepleId={meeple.id}
                      displayName={meeple.displayName}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div>
        <h2 className="font-serif text-lg font-bold">Neues Mitglied einladen</h2>
        <div className="mt-3 max-w-sm">
          <InviteForm />
        </div>
      </div>
    </div>
  );
}
