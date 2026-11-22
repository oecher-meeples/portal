import { PageHeading } from "@/components/ui/page-heading";
import { requireMember, hasPermissionInCurrentView } from "@/lib/auth/session";
import { ScanView } from "@/components/feature/scan/scan-view";
import {
  parseScannerMode,
  parseScannerTargetUnit,
} from "@/lib/ludothek/scanner-modes";

const MODES_DESCRIPTION =
  "Erhalten: Spiele nacheinander auf dich buchen. Übergeben: erst das Ziel scannen, dann die Spiele. Einzel-Scan: ein Spiel oder eine Einheit scannen und den passenden Vorgang wählen.";

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
  const params = await searchParams;
  const initialMode = parseScannerMode(params.modus, canManageGames);

  return (
    <div className="flex flex-col gap-6">
      {/* #587: im Fokusmodus ausgeblendet (mehr Platz für die Kamera). */}
      <div className="focus-mode:hidden">
        <PageHeading
          eyebrow="Kamera-Scan"
          title="Scanner"
          description={
            canManageGames
              ? `${MODES_DESCRIPTION} Zur Kontrolle markieren / Kontrollieren: Vollständigkeit prüfen.`
              : MODES_DESCRIPTION
          }
        />
      </div>
      <ScanView
        canManageGames={canManageGames}
        initialMode={initialMode}
        initialTargetUnitId={parseScannerTargetUnit(initialMode, params.ziel)}
      />
    </div>
  );
}
