import { RoleGate } from "@/components/shared/role-gate";
import { PageHeading } from "@/components/shared/page-heading";
import { StatusPill } from "@/components/shared/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ProfilPage() {
  return (
    <RoleGate minRole="mitglied">
      <div className="flex flex-col gap-6">
        <PageHeading
          eyebrow="Self-Service"
          title="Mein Profil"
          description="DSGVO-konforme Verwaltung deiner Daten und Verknüpfung externer Plattformen."
        />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-4 rounded-lg border bg-card p-6">
            <div className="flex items-center gap-3">
              <span className="flex size-12 items-center justify-center rounded-full bg-foreground font-serif text-lg font-bold text-background">
                JH
              </span>
              <div>
                <p className="font-serif text-lg font-semibold">Jan Herwig</p>
                <StatusPill label="Aktives Mitglied seit 2024" tone="positive" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="profile-email">E-Mail</Label>
              <Input id="profile-email" type="email" defaultValue="mail@jan-herwig.de" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="profile-iban">IBAN (Lastschrift)</Label>
              <Input id="profile-iban" defaultValue="•••• •••• •••• 1234 · verschlüsselt" readOnly />
            </div>
            <Button variant="outline" className="w-fit">
              Änderungen speichern
            </Button>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-lg border bg-card p-5">
              <h2 className="font-serif text-lg font-bold">Externe Verknüpfungen</h2>
              <ul className="mt-3 flex flex-col divide-y">
                <li className="flex items-center justify-between py-2.5">
                  <span>🎮 Board Game Arena</span>
                  <StatusPill label="verbunden" tone="positive" />
                </li>
                <li className="flex items-center justify-between py-2.5">
                  <span>🎲 BoardGameGeek</span>
                  <Button variant="outline" size="sm">
                    Verknüpfen
                  </Button>
                </li>
              </ul>
            </div>

            <div className="rounded-lg border bg-card p-5">
              <h2 className="font-serif text-lg font-bold">Anmeldung</h2>
              <p className="mt-3 rounded-md bg-primary/10 p-3 text-sm">
                🔒 Angemeldet via <strong>Google SSO</strong>
              </p>
            </div>

            <div className="rounded-lg border border-destructive/30 bg-card p-5">
              <h2 className="font-serif text-lg font-bold text-destructive">Konto &amp; DSGVO</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Bei Austritt wird dein Konto gelöscht, deine Verleih-Historie bleibt anonymisiert erhalten.
              </p>
              <Button variant="outline" className="mt-3 border-destructive/40 text-destructive hover:bg-destructive/10">
                Daten exportieren
              </Button>
            </div>
          </div>
        </div>
      </div>
    </RoleGate>
  );
}
