/**
 * The four downloads previously hard-coded in src/data/downloads.ts, migrated
 * as Download rows so an admin can manage their visibility from now on.
 * `fileUrl` still points at the static file under public/downloads/ — a
 * future re-upload through the admin UI replaces it with a Vercel Blob URL.
 */
export const DEMO_DOWNLOADS = [
  {
    title: "Mitgliedsantrag",
    fileName: "Mitgliedsantrag.pdf",
    fileUrl: "/downloads/Mitgliedsantrag.pdf",
    fileType: "PDF",
    fileSizeBytes: 652,
    order: 0,
  },
  {
    title: "SEPA-Lastschriftmandat",
    fileName: "SEPA-Lastschriftmandat.pdf",
    fileUrl: "/downloads/SEPA-Lastschriftmandat.pdf",
    fileType: "PDF",
    fileSizeBytes: 659,
    order: 1,
  },
  {
    title: "Ludotheks-Ordnung",
    fileName: "Ludotheks-Ordnung.pdf",
    fileUrl: "/downloads/Ludotheks-Ordnung.pdf",
    fileType: "PDF",
    fileSizeBytes: 654,
    order: 2,
  },
  {
    title: "Bring-&-Buy-Vorlage",
    fileName: "Bring-Buy-Vorlage.xlsx",
    fileUrl: "/downloads/Bring-Buy-Vorlage.xlsx",
    fileType: "XLSX",
    fileSizeBytes: 1641,
    order: 3,
  },
];
