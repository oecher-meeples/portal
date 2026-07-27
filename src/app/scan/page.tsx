import { Camera } from "lucide-react";
import { RoleGate } from "@/components/shared/role-gate";
import { PageHeading } from "@/components/shared/page-heading";
import { Button } from "@/components/ui/button";
import { ScanModeSwitcher } from "@/app/scan/scan-mode-switcher";

export default function ScanPage() {
  return (
    <RoleGate minRole="mitglied">
      <div className="flex flex-col gap-6">
        <PageHeading
          eyebrow="Kamera-Scan"
          title="Spiel scannen"
          description="Halte ein Vereins-QR-Etikett oder den EAN-Barcode vor die Kamera – für Ausleihe, Rückgabe und Inventur."
        />
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="overflow-hidden rounded-lg border bg-neutral-950">
            <div className="relative flex aspect-video items-center justify-center">
              <div className="flex flex-col items-center gap-2 text-neutral-500">
                <Camera className="size-8" />
                <span className="text-xs">Kamera-Vorschau · QR im Rahmen platzieren</span>
              </div>
              <div className="pointer-events-none absolute inset-12 rounded-lg border-2 border-primary sm:inset-24" />
            </div>
            <div className="flex items-center justify-between gap-3 bg-neutral-900 px-4 py-2.5 text-sm text-neutral-100">
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                Erkannt: OM-2026-0421
              </span>
              <span className="font-semibold">Arche Nova</span>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-lg border bg-card p-5">
            <h2 className="font-serif text-lg font-bold">Ausleihe bestätigen</h2>
            <p className="text-sm text-muted-foreground">
              Transaktionssicher – der Status springt sofort auf „Verliehen“.
            </p>
            <dl className="flex flex-col divide-y border-t">
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-sm text-muted-foreground">Spiel</dt>
                <dd className="font-medium">Arche Nova</dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-sm text-muted-foreground">Exemplar</dt>
                <dd className="rounded bg-muted px-2 py-0.5 font-mono text-sm">OM-2026-0421</dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-sm text-muted-foreground">Leiher</dt>
                <dd className="font-medium">Jan H. (du)</dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-sm text-muted-foreground">Rückgabe bis</dt>
                <dd className="font-medium">10.08.2026</dd>
              </div>
            </dl>
            <div className="flex items-center gap-4">
              <Button>Ausleihe bestätigen</Button>
              <Button variant="ghost">Abbrechen</Button>
            </div>
            <ScanModeSwitcher />
          </div>
        </div>
      </div>
    </RoleGate>
  );
}
