export type Download = {
  title: string;
  filetype: string;
  size: string;
};

export const DOWNLOADS: Download[] = [
  { title: "Mitgliedsantrag", filetype: "PDF", size: "210 KB" },
  { title: "SEPA-Lastschriftmandat", filetype: "PDF", size: "98 KB" },
  { title: "Ludotheks-Ordnung", filetype: "PDF", size: "140 KB" },
  { title: "Bring-&-Buy-Vorlage", filetype: "XLSX", size: "22 KB" },
];

export type LegalDoc = {
  slug: string;
  title: string;
};

export const LEGAL_DOCS: LegalDoc[] = [
  { slug: "satzung", title: "Vereinssatzung" },
  { slug: "datenschutz", title: "Datenschutzerklärung (DSGVO)" },
  { slug: "impressum", title: "Impressum" },
  { slug: "beitragsordnung", title: "Beitragsordnung" },
];
