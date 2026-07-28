import { PageHeading } from "@/components/ui/page-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DonationAmountPicker } from "@/app/spenden/donation-amount-picker";

export default function SpendenPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Support"
        title="UnterstÃ¼tze die Oecher Meeples"
        description="Als gemeinnÃ¼tziger Verein finanzieren wir Ludothek, RÃ¤ume und Events Ã¼berwiegend aus BeitrÃ¤gen und Spenden."
      />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-card flex flex-col gap-4 rounded-lg border p-6">
          <h2 className="font-serif text-lg font-bold">Einmalig spenden</h2>
          <DonationAmountPicker />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="donor-name">Name (optional)</Label>
            <Input id="donor-name" placeholder="FÃ¼r die Spendenquittung" />
          </div>
          <Button size="lg">Mit PayPal spenden</Button>
          <p className="text-muted-foreground text-xs">
            Sichere Weiterleitung zu PayPal. Es werden keine Zahlungsdaten in
            der App gespeichert.
          </p>
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
              <dd className="font-medium">60 â‚¬ / Jahr</dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-muted-foreground text-sm">ErmÃ¤ÃŸigt</dt>
              <dd className="font-medium">36 â‚¬ / Jahr</dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-muted-foreground text-sm">Aufnahme</dt>
              <dd className="font-medium">auf Einladung eines Mitglieds</dd>
            </div>
          </dl>
          <Button
            variant="outline"
            render={<a href="/downloads">Mitgliedsantrag herunterladen â†’</a>}
          />
        </div>
      </div>
    </div>
  );
}
