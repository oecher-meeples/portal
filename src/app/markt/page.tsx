import { requireMember } from "@/lib/session";
import { PageHeading } from "@/components/ui/page-heading";
import { Separator } from "@/components/ui/separator";
import { MARKET_LISTINGS, SPARE_PART_LISTINGS } from "@/data/market";
import { MarktBrowser } from "@/components/feature/markt/markt-browser";
import { FleaMarketSection } from "@/components/feature/bringbuy/markt-view";

export default async function MarktPage() {
  await requireMember();

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Community-Handel"
        title="Marktplatz & Ersatzteillager"
        description="Interner Kleinanzeigen-Markt zwischen Mitgliedern – plus das Ausschlacht-Lager für einzelne Komponenten."
      />
      <MarktBrowser
        listings={MARKET_LISTINGS}
        spareParts={SPARE_PART_LISTINGS}
      />
      <Separator />
      <FleaMarketSection />
    </div>
  );
}
