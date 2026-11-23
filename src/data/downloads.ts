export type LegalDoc = {
  slug: string;
  title: string;
};

export const LEGAL_DOCS: LegalDoc[] = [
  { slug: "satzung", title: "Vereinssatzung" },
  { slug: "datenschutz", title: "Datenschutzerklärung (DSGVO)" },
  { slug: "impressum", title: "Impressum" },
  { slug: "beitragsordnung", title: "Beitragsordnung" },
  { slug: "urheberrechte", title: "Genutzte Urheberrechte" },
];
