import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { CARD_HOVER_CLASS } from "@/components/ui/card-hover";
import { Card, CardTitle } from "@/components/ui/card";

/** Private-Spiele-Bereich für **andere** Meeple, die dieses Profil öffnen
 * (#384) — nur sichtbar bei `privateCollectionVisible`-Freigabe. Der
 * Aufrufer (`mitglied-profil-view.tsx`) rendert für den Meeple selbst
 * stattdessen die volle `PrivateCollectionCard` (`components/widgets/`),
 * die Import/Verwaltung nur für die eigene Session unterstützt. `bei`+
 * `privatbesitz` sind bestehende Ludothek-Filterparameter
 * (`parseLudothekSearchParams`) — kein neuer Filtermechanismus nötig.
 *
 * Ganze Card als Link, nicht nur der Textblock (Live-Review F13) — analog
 * `SettingsCard`. */
export function PrivateSpieleSection({ meepleId }: { meepleId: string }) {
  return (
    <Link href={`/ludothek?privatbesitz=1&bei=${meepleId}`} className="group">
      <Card className={cn("gap-2", CARD_HOVER_CLASS)}>
        <CardTitle>Private Spiele</CardTitle>
        <p className="text-muted-foreground text-sm">
          Dieses Mitglied hat seine private BGG-Collection für andere Meeple
          freigegeben.
        </p>
        <span className="text-primary flex w-fit items-center gap-1.5 text-base font-medium underline-offset-2 group-hover:underline">
          In der Ludothek ansehen
          <ExternalLink className="size-4" />
        </span>
      </Card>
    </Link>
  );
}
