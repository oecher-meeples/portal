/**
 * The four downloads previously hard-coded in src/data/downloads.ts, migrated
 * as Download rows so an admin can manage their visibility from now on.
 * `fileUrl` still points at the static file under public/downloads/ — a
 * future re-upload through the admin UI replaces it with a Vercel Blob URL.
 */
export const DEMO_DOWNLOADS = [
  {
    title: "Mitgliedsantrag",
    fileUrl: "/downloads/Mitgliedsantrag.pdf",
    fileType: "PDF",
    fileSizeBytes: 652,
  },
  {
    title: "SEPA-Lastschriftmandat",
    fileUrl: "/downloads/SEPA-Lastschriftmandat.pdf",
    fileType: "PDF",
    fileSizeBytes: 659,
  },
  {
    title: "Ludotheks-Ordnung",
    fileUrl: "/downloads/Ludotheks-Ordnung.pdf",
    fileType: "PDF",
    fileSizeBytes: 654,
  },
  {
    title: "Bring-&-Buy-Vorlage",
    fileUrl: "/downloads/Bring-Buy-Vorlage.xlsx",
    fileType: "XLSX",
    fileSizeBytes: 1641,
  },
];
