import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Kompakter Link zum BGG-Eintrag (Logo + Extern-Icon), einheitlich auf der
 * Spieledetailseite und der Katalogseite (#637). */
export function BggLinkButton({ href }: { href: string }) {
  return (
    <Button
      variant="outline"
      className="gap-1.5 px-2.5"
      aria-label="Auf BoardGameGeek ansehen"
      render={<a href={href} target="_blank" rel="noopener noreferrer" />}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- statisches Logo aus public/, keine Optimierung nötig */}
      <img src="/bgg-logo.svg" alt="" className="h-4 w-auto" />
      <ExternalLink className="size-4" />
    </Button>
  );
}
