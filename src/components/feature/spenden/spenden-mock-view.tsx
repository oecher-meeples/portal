import { PageHeading } from "@/components/ui/page-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DonationAmountPicker } from "@/components/feature/spenden/donation-amount-picker";
import { PageContainer } from "@/components/ui/page-container";

const PAYPAL_DONATION_URL = "https://paypal.me/oechermeeples";
const GAME_DONATION_MAIL = "spenden@oecher-meeples.org";

export function SpendenMockView() {
  return (
    <PageContainer className="gap-6">
      <PageHeading
        eyebrow="Support"
        title="Unterstütze die Oecher Meeples"
        description="Als gemeinnütziger Verein finanzieren wir Ludothek, Räume und Events überwiegend aus Beiträgen und Spenden."
      />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-card flex flex-col gap-4 rounded-lg border p-6">
          <h2 className="font-serif text-lg font-bold">Einmalig spenden</h2>
          <DonationAmountPicker />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="donor-name">Name (optional)</Label>
            <Input id="donor-name" placeholder="Für die Spendenquittung" />
          </div>
          <Button
            size="lg"
            render={
              <a
                href={PAYPAL_DONATION_URL}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            Mit PayPal spenden
          </Button>
          <p className="text-muted-foreground text-xs">
            Sichere Weiterleitung zu PayPal. Es werden keine Zahlungsdaten in
            der App gespeichert.
          </p>
        </div>

        <div className="bg-card flex flex-col gap-4 rounded-lg border p-6">
          <h2 className="font-serif text-lg font-bold">Spiele spenden</h2>
          <p className="text-muted-foreground text-sm">
            Du möchtest vollständige, funktionsfähige Spiele in unseren
            Vereinsbestand geben? Wir übernehmen sie gerne in die Ludothek. Für
            beschädigte oder unvollständige Spiele (Ersatzteillager) nutze bitte
            den Marktplatz.
          </p>
          <Button
            variant="outline"
            render={<a href={`mailto:${GAME_DONATION_MAIL}`} />}
          >
            {GAME_DONATION_MAIL}
          </Button>
        </div>

        <div className="bg-card flex flex-col gap-4 rounded-lg border p-6">
          <h2 className="font-serif text-lg font-bold">Mitglied werden</h2>
          <p className="text-muted-foreground text-sm">
            Vollen Zugang zur Ludothek, Spielergesuchen und dem internen Bereich
            bekommst du als Mitglied.
          </p>
          <dl className="flex flex-col divide-y border-t">
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-muted-foreground text-sm">Beitrag</dt>
              <dd className="font-medium">60 € / Jahr</dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-muted-foreground text-sm">Ermäßigt</dt>
              <dd className="font-medium">36 € / Jahr</dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-muted-foreground text-sm">Aufnahme</dt>
              <dd className="font-medium">auf Einladung eines Mitglieds</dd>
            </div>
          </dl>
          <Button
            variant="outline"
            render={<a href="/downloads">Mitgliedsantrag herunterladen →</a>}
          />
        </div>
      </div>
    </PageContainer>
  );
}
