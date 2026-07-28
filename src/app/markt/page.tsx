import { requireMember } from "@/lib/session";
import { PageHeading } from "@/components/ui/page-heading";
import { MARKET_LISTINGS, SPARE_PART_LISTINGS } from "@/data/market";
import { MarktBrowser } from "@/app/markt/markt-browser";

export default async function MarktPage() {
  await requireMember();

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Community-Handel"
        title="Marktplatz & Ersatzteillager"
        description="Interner Kleinanzeigen-Markt zwischen Mitgliedern â€“ plus das Ausschlacht-Lager fÃ¼r einzelne Komponenten."
      />
      <MarktBrowser
        listings={MARKET_LISTINGS}
        spareParts={SPARE_PART_LISTINGS}
      />
    </div>
  );
}
