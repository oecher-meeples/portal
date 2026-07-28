import { requireMember } from "@/lib/session";
import { PageHeading } from "@/components/shared/page-heading";
import { StatusPill } from "@/components/shared/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function ProfilPage() {
  await requireMember();

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Self-Service"
        title="Mein Profil"
        description="DSGVO-konforme Verwaltung deiner Daten und Verknüpfung externer Plattformen."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-card flex flex-col gap-4 rounded-lg border p-6">
          <div className="flex items-center gap-3">
            <span className="bg-foreground text-background flex size-12 items-center justify-center rounded-full font-serif text-lg font-bold">
              JH
            </span>
            <div>
              <p className="font-serif text-lg font-semibold">Jan Herwig</p>
              <StatusPill label="Aktives Mitglied seit 2024" tone="positive" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-email">E-Mail</Label>
            <Input
              id="profile-email"
              type="email"
              defaultValue="mail@jan-herwig.de"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="profile-iban">IBAN (Lastschrift)</Label>
            <Input
              id="profile-iban"
              defaultValue="•••• •••• •••• 1234 · verschlüsselt"
              readOnly
            />
          </div>
          <Button variant="outline" className="w-fit">
            Änderungen speichern
          </Button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="bg-card rounded-lg border p-5">
            <h2 className="font-serif text-lg font-bold">
              Externe Verknüpfungen
            </h2>
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

          <div className="bg-card rounded-lg border p-5">
            <h2 className="font-serif text-lg font-bold">Anmeldung</h2>
            <p className="bg-primary/10 mt-3 rounded-md p-3 text-sm">
              🔒 Angemeldet via <strong>Google SSO</strong>
            </p>
          </div>

          <div className="border-destructive/30 bg-card rounded-lg border p-5">
            <h2 className="text-destructive font-serif text-lg font-bold">
              Konto &amp; DSGVO
            </h2>
            <p className="text-muted-foreground mt-1.5 text-sm">
              Bei Austritt wird dein Konto gelöscht, deine Verleih-Historie
              bleibt anonymisiert erhalten.
            </p>
            <Button
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10 mt-3"
            >
              Daten exportieren
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
