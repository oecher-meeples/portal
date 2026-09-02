import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { CARD_HOVER_CLASS } from "@/components/ui/card-hover";

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
      <div
        className={cn(
          "bg-card flex flex-col gap-2 rounded-lg border p-5",
          CARD_HOVER_CLASS,
        )}
      >
        <h2 className="font-serif text-lg font-bold">Private Spiele</h2>
        <p className="text-muted-foreground text-sm">
          Dieses Mitglied hat seine private BGG-Collection für andere Meeple
          freigegeben.
        </p>
        <span className="text-primary flex w-fit items-center gap-1.5 text-base font-medium underline-offset-2 group-hover:underline">
          In der Ludothek ansehen
          <ExternalLink className="size-4" />
        </span>
      </div>
    </Link>
  );
}
