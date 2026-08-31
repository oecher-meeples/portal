import Link from "next/link";

/** Private-Spiele-Bereich für **andere** Meeple, die dieses Profil öffnen
 * (#384) — nur sichtbar bei `privateCollectionVisible`-Freigabe. Der
 * Aufrufer (`mitglied-profil-view.tsx`) rendert für den Meeple selbst
 * stattdessen die volle `PrivateCollectionCard` (`components/widgets/`),
 * die Import/Verwaltung nur für die eigene Session unterstützt. `bei`+
 * `privatbesitz` sind bestehende Ludothek-Filterparameter
 * (`parseLudothekSearchParams`) — kein neuer Filtermechanismus nötig. */
export function PrivateSpieleSection({ meepleId }: { meepleId: string }) {
  return (
    <div className="bg-card flex flex-col gap-2 rounded-lg border p-5">
      <h2 className="font-serif text-lg font-bold">Private Spiele</h2>
      <p className="text-muted-foreground text-sm">
        Dieses Mitglied hat seine private BGG-Collection für andere Meeple
        freigegeben.
      </p>
      <Link
        href={`/ludothek?privatbesitz=1&bei=${meepleId}`}
        className="text-primary w-fit text-sm underline underline-offset-2"
      >
        In der Ludothek ansehen
      </Link>
    </div>
  );
}
