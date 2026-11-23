/**
 * The four downloads previously hard-coded in src/data/downloads.ts, migrated
 * as Download rows so an admin can manage their visibility from now on.
 * `fileKey` still points at the static file under public/downloads/ (an app
 * path, `signedBlobUrl` passes it through) — a future re-upload through the
 * admin UI replaces it with a blob storage key (#112).
 */
export const DEMO_DOWNLOADS = [
  {
    title: "Mitgliedsantrag",
    fileName: "Mitgliedsantrag.pdf",
    fileKey: "/downloads/Mitgliedsantrag.pdf",
    fileType: "PDF",
    fileSizeBytes: 652,
    order: 0,
  },
  {
    title: "SEPA-Lastschriftmandat",
    fileName: "SEPA-Lastschriftmandat.pdf",
    fileKey: "/downloads/SEPA-Lastschriftmandat.pdf",
    fileType: "PDF",
    fileSizeBytes: 659,
    order: 1,
  },
  {
    title: "Ludotheks-Ordnung",
    fileName: "Ludotheks-Ordnung.pdf",
    fileKey: "/downloads/Ludotheks-Ordnung.pdf",
    fileType: "PDF",
    fileSizeBytes: 654,
    order: 2,
  },
  {
    title: "Bring-&-Buy-Vorlage",
    fileName: "Bring-Buy-Vorlage.xlsx",
    fileKey: "/downloads/Bring-Buy-Vorlage.xlsx",
    fileType: "XLSX",
    fileSizeBytes: 1641,
    order: 3,
  },
];
