import { PageHeading } from "@/components/ui/page-heading";
import { requireMember, hasPermissionInCurrentView } from "@/lib/auth/session";
import { ScanView } from "@/components/feature/scan/scan-view";

export default async function ScanPage() {
  const { user } = await requireMember();
  const canManageGames = await hasPermissionInCurrentView(
    user.id,
    "games:manage",
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Kamera-Scan"
        title="Spiel scannen"
        description="Halte ein Einheiten-Etikett oder den EAN-Barcode vor die Kamera — die passenden Vorgänge werden danach angeboten."
      />
      <ScanView canManageGames={canManageGames} />
    </div>
  );
}
