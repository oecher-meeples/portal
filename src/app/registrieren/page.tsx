import { PageHeading } from "@/components/shared/page-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegistrierenPage() {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <PageHeading
        eyebrow="Onboarding via Einladung"
        title="Konto einrichten"
        description="Dein Einladungslink wurde erkannt. Lege ein Passwort fest, um deinen Zugang zu aktivieren."
      />
      <div className="flex flex-col gap-4 rounded-lg border bg-card p-6">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="invite-token">Einladungs-Token</Label>
          <Input id="invite-token" readOnly defaultValue="OM-INVITE-7F3A9C" className="font-mono text-sm" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reg-email">E-Mail</Label>
          <Input id="reg-email" type="email" defaultValue="neu@example.de" readOnly />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reg-password">Passwort festlegen</Label>
          <Input id="reg-password" type="password" placeholder="••••••••" />
        </div>
        <Button>Konto aktivieren</Button>
      </div>
      <p className="rounded-md border border-dashed p-3 text-center text-sm text-muted-foreground">
        Fehlerzustand (Beispiel): „Token ungültig oder abgelaufen – bitte
        wende dich an einen Admin.“
      </p>
    </div>
  );
}
