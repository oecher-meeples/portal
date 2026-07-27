import { RoleGate } from "@/components/shared/role-gate";
import { PageHeading } from "@/components/shared/page-heading";
import { MARKET_LISTINGS, SPARE_PART_LISTINGS } from "@/data/market";
import { MarktBrowser } from "@/app/markt/markt-browser";

export default function MarktPage() {
  return (
    <RoleGate minRole="mitglied">
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
      </div>
    </RoleGate>
  );
}
