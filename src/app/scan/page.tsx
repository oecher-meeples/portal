import { PageHeading } from "@/components/ui/page-heading";
import { requireMember, hasPermissionInCurrentView } from "@/lib/auth/session";
import { ScanView } from "@/components/feature/scan/scan-view";
import { parseScannerMode } from "@/lib/ludothek/scanner-modes";

const MODES_DESCRIPTION =
  "Erhalten: Spiele nacheinander auf dich buchen. Einzel-Scan: ein Spiel oder eine Einheit scannen und den passenden Vorgang wählen.";

export default async function ScanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await requireMember();
  const canManageGames = await hasPermissionInCurrentView(
    user.id,
    "games:manage",
  );
  // Nicht erlaubte/ungültige Modi fallen still auf den Einzel-Scan (#538).
  const initialMode = parseScannerMode(
    (await searchParams).modus,
    canManageGames,
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Kamera-Scan"
        title="Scanner"
        description={
          canManageGames
            ? `${MODES_DESCRIPTION} Zur Kontrolle markieren / Kontrollieren: Vollständigkeit prüfen.`
            : MODES_DESCRIPTION
        }
      />
      <ScanView canManageGames={canManageGames} initialMode={initialMode} />
    </div>
  );
}
