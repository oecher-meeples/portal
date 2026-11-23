/**
 * Demo-Marktplatz-Anzeigen (`MarketListing`) — private Verkaufsangebote von
 * Meeples untereinander, unabhängig vom Flohmarkt-Event-Modul
 * (`FleaMarketItem`). `sellerKey` referenziert einen der Schlüssel aus
 * `meepleIdByKey` in `prisma/seed.ts`.
 */
export type DemoMarketListing = {
  id: string;
  sellerKey: string;
  title: string;
  description?: string;
  priceEuros: number;
  condition: string;
};

export const DEMO_MARKET_LISTINGS: DemoMarketListing[] = [
  {
    id: "demo-market-carcassonne",
    sellerKey: "tobias",
    title: "Carcassonne Grundspiel",
    description:
      "Einmal durchgespielt, alle Teile vollständig. Abzugeben, da doppelt geschenkt bekommen.",
    priceEuros: 12,
    condition: "Sehr gut",
  },
  {
    id: "demo-market-siedler-erweiterung",
    sellerKey: "lea",
    title: "Catan – Seefahrer Erweiterung",
    description:
      "Gut erhalten, Karton mit leichten Gebrauchsspuren, Inhalt komplett.",
    priceEuros: 15,
    condition: "Gut",
  },
  {
    id: "demo-market-kartenspiel-sammlung",
    sellerKey: "redakteur",
    title: "Sammlung kleiner Kartenspiele (5 Stück)",
    description:
      "Skip-Bo, Uno, Mau-Mau, Werwölfe und Sechser Raus im Paket. Nur zusammen abzugeben.",
    priceEuros: 10,
    condition: "Gut",
  },
  {
    id: "demo-market-vereinsheim-regal",
    sellerKey: "vater",
    title: "Kleines Spieleregal, 3 Fächer",
    description:
      "Ausrangiertes Regal aus dem Vereinsheim, ideal für die eigene Sammlung. Selbstabholung.",
    priceEuros: 5,
    condition: "Gebraucht, funktionstüchtig",
  },
];
