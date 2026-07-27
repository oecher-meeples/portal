export type Download = {
  title: string;
  filetype: string;
  size: string;
  href: string;
};

export const DOWNLOADS: Download[] = [
  {
    title: "Mitgliedsantrag",
    filetype: "PDF",
    size: "210 KB",
    href: "/downloads/Mitgliedsantrag.pdf",
  },
  {
    title: "SEPA-Lastschriftmandat",
    filetype: "PDF",
    size: "98 KB",
    href: "/downloads/SEPA-Lastschriftmandat.pdf",
  },
  {
    title: "Ludotheks-Ordnung",
    filetype: "PDF",
    size: "140 KB",
    href: "/downloads/Ludotheks-Ordnung.pdf",
  },
  {
    title: "Bring-&-Buy-Vorlage",
    filetype: "XLSX",
    size: "22 KB",
    href: "/downloads/Bring-Buy-Vorlage.xlsx",
  },
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
