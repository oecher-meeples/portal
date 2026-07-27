export type MarketListing = {
  id: string;
  title: string;
  price: number;
  condition: string;
  seller: string;
  description: string;
};

export const MARKET_LISTINGS: MarketListing[] = [
  {
    id: "catan-seefahrer",
    title: "Catan – Seefahrer",
    price: 12,
    condition: "Sehr gut",
    seller: "Jan",
    description:
      "Seefahrer-Erweiterung zu Catan, vollständig, Karten in Sleeves. Kartons zeigen leichte Gebrauchsspuren.",
  },
  {
    id: "carcassonne-grundspiel",
    title: "Carcassonne Grundspiel",
    price: 8,
    condition: "Gebraucht",
    seller: "Lea",
    description:
      "Grundspiel inkl. aller Landschaftsplättchen und Meeple. Karton etwas eingerissen.",
  },
  {
    id: "meeple-set-bunt",
    title: "Meeple-Set (bunt, 24×)",
    price: 5,
    condition: "Neu",
    seller: "Verein",
    description: "24 bunte Ersatz-Meeple aus Vereinsbestand, ungebraucht.",
  },
  {
    id: "terra-mystica",
    title: "Terra Mystica",
    price: 25,
    condition: "Gut, komplett",
    seller: "Tobias",
    description:
      "Terra Mystica Grundspiel, alle Fraktionsplatten und Ressourcen vorhanden.",
  },
  {
    id: "sanduhr-30s",
    title: "Sanduhr 30s",
    price: 2,
    condition: "Neuwertig",
    seller: "Nadia",
    description:
      "30-Sekunden-Sanduhr aus einer Partyspiel-Sammlung, kaum benutzt.",
  },
  {
    id: "wuerfelturm-holz",
    title: "Würfelturm (Holz)",
    price: 10,
    condition: "Bespielt",
    seller: "Jan",
    description:
      "Handgefertigter Würfelturm aus Holz, funktionstüchtig, leichte Gebrauchsspuren.",
  },
];

export type SparePartListing = {
  id: string;
  title: string;
  condition: string;
  description: string;
};

export const SPARE_PART_LISTINGS: SparePartListing[] = [
  {
    id: "allgemeines",
    title: "Allgemeines",
    condition: "gemischt",
    description:
      "Sammelbehälter für lose Würfel, Holzteile und Karten ohne festes Spiel.",
  },
  {
    id: "agricola-ausschlachtung",
    title: "Agricola (Ausschlachtung)",
    condition: "beschädigt",
    description:
      "Deinventarisiertes Exemplar, Tableaus und Holzressourcen zur Weiterverwendung.",
  },
  {
    id: "root-ausschlachtung",
    title: "Root (Ausschlachtung)",
    condition: "Wasserschaden",
    description:
      "Spielplan beschädigt, Fraktionskomponenten größtenteils intakt.",
  },
];

export function getMarketListing(id: string) {
  return MARKET_LISTINGS.find((listing) => listing.id === id);
}
