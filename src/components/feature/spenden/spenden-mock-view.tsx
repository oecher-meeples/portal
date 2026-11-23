import { Card, CardTitle } from "@/components/ui/card";
import { PageHeading } from "@/components/ui/page-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DonationAmountPicker } from "@/components/feature/spenden/donation-amount-picker";
import { PageContainer } from "@/components/ui/page-container";
import { Field } from "@/components/ui/field";
import { CONTRIBUTION_CATEGORY_LABELS } from "@/lib/members/contribution";

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
        <Card className="gap-4">
          <CardTitle>Einmalig spenden</CardTitle>
          <DonationAmountPicker />
          <Field label="Name (optional)" htmlFor="donor-name">
            <Input id="donor-name" placeholder="Für die Spendenquittung" />
          </Field>
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
        </Card>

        <Card className="gap-4">
          <CardTitle>Spiele spenden</CardTitle>
          <p className="text-muted-foreground text-sm">
            Du möchtest Spiele in unseren Vereinsbestand geben? Wir freuen uns
            über jede Spende — unabhängig vom Zustand. Der Spielwart
            entscheidet, ob dein Spiel in die Ludothek oder ins Ersatzteillager
            kommt.
          </p>
          <Button
            variant="outline"
            render={<a href={`mailto:${GAME_DONATION_MAIL}`} />}
          >
            {GAME_DONATION_MAIL}
          </Button>
        </Card>

        <Card className="gap-4">
          <CardTitle>Mitglied werden</CardTitle>
          <p className="text-muted-foreground text-sm">
            Vollen Zugang zur Ludothek, Spielergesuchen und dem internen Bereich
            bekommst du als Mitglied.
          </p>
          <dl className="flex flex-col divide-y border-t">
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-muted-foreground text-sm">
                {CONTRIBUTION_CATEGORY_LABELS.mini} (unter 13 Jahre)
              </dt>
              <dd className="font-medium">0 € / Jahr</dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-muted-foreground text-sm">
                {CONTRIBUTION_CATEGORY_LABELS.jung} (13–18 Jahre)
              </dt>
              <dd className="font-medium">12 € / Jahr</dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-muted-foreground text-sm">
                {CONTRIBUTION_CATEGORY_LABELS.meeple} (ab 18 Jahren)
              </dt>
              <dd className="font-medium">36 € / Jahr</dd>
            </div>
          </dl>
          <Button
            variant="outline"
            render={
              <a href="/downloads/Mitgliedsantrag">
                Mitgliedsantrag herunterladen →
              </a>
            }
          />
        </Card>
      </div>
    </PageContainer>
  );
}
