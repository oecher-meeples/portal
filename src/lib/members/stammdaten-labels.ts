/** Deutsche Labels für die im Stammdaten-Bereich (#380) bearbeitbaren Felder
 * — bewusst ohne `email`, die läuft weiterhin über den eigenen
 * `MEMBER_EMAIL`-Antragstyp. Fachvokabular gehört nach `lib/`, nicht in die
 * Komponente (siehe CLAUDE.md). Eigenes, `server-only`-freies Modul, damit es
 * auch aus der Client-Komponente `stammdaten-section.tsx` importierbar
 * bleibt (analog `membership-state.ts`). */
export const STAMMDATEN_FIELD_LABELS = {
  firstName: "Vorname",
  lastName: "Nachname",
  birthDate: "Geburtsdatum",
  birthPlace: "Geburtsort",
  street: "Straße",
  postalCode: "PLZ",
  city: "Ort",
  phone: "Telefon",
  /** #388 — eigene Tabelle statt Enum, siehe `lib/members/tshirt-sizes.ts`. */
  tshirtSizeId: "T-Shirt-Größe",
} as const;

export type StammdatenField = keyof typeof STAMMDATEN_FIELD_LABELS;
