export type FleaMarketStatus = "FOR_SALE" | "RESERVED" | "SOLD";

export type FleaMarketItem = {
  id: string;
  title: string;
  seller: string;
  price: number;
  status: FleaMarketStatus;
};

export const FLEA_MARKET_ITEMS: FleaMarketItem[] = [
  {
    id: "A-021",
    title: "Wingspan",
    seller: "Lea",
    price: 28,
    status: "FOR_SALE",
  },
  {
    id: "A-088",
    title: "7 Wonders",
    seller: "Tobias",
    price: 15,
    status: "RESERVED",
  },
  { id: "A-014", title: "Splendor", seller: "Jan", price: 10, status: "SOLD" },
  {
    id: "A-102",
    title: "Azul",
    seller: "Nadia",
    price: 22,
    status: "FOR_SALE",
  },
];

export const FLEA_MARKET_STATS = {
  listed: 142,
  soldToday: 37,
  revenue: 428,
  reserved: 5,
};

export const FLEA_STATUS_LABELS: Record<FleaMarketStatus, string> = {
  FOR_SALE: "im Verkauf",
  RESERVED: "reserviert",
  SOLD: "verkauft",
};
