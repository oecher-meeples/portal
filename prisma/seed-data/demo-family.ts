/**
 * Demo-Familie "Musterfamilie" — deckt das Erziehungsberechtigte-Modell
 * (#373) mit realistischen Rollen ab: Vater und Mutter haben je einen
 * Meeple-Account (Login), die Kinder nicht. JungSohn (13–18, Kategorie
 * "jung") hat trotzdem eine eigene E-Mail hinterlegt — möglich, aber nicht
 * Pflicht (siehe `requiresEmail()` in `lib/members/contribution.ts`).
 * MiniTochter (< 13, Kategorie "mini") hat weder Login noch E-Mail.
 */

const DEMO_FAMILY_ADDRESS = {
  street: "Musterstraße 12",
  postalCode: "52062",
  city: "Aachen",
};

export type DemoFamilyParent = {
  email: string;
  password: string;
  name: string;
  firstName: string;
  lastName: string;
  birthDate: Date;
  street: string;
  postalCode: string;
  city: string;
  /** Kinder (JungSohn/MiniTochter) bekommen bewusst keine IBAN — sie sind
   * nicht die Beitragszahler:innen der Familie. */
  iban: string;
};

export type DemoFamilyChild = {
  firstName: string;
  lastName: string;
  birthDate: Date;
  email: string | null;
  street: string;
  postalCode: string;
  city: string;
};

const DEMO_FAMILY_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? "demo1234";

export const DEMO_FAMILY_VATER: DemoFamilyParent = {
  email:
    process.env.SEED_DEMO_FAMILY_VATER_EMAIL ??
    "vater.musterfamilie@jan-herwig.de",
  password: DEMO_FAMILY_PASSWORD,
  name: "Vater Musterfamilie",
  firstName: "Vater",
  lastName: "Musterfamilie",
  birthDate: new Date("1985-04-12"),
  ...DEMO_FAMILY_ADDRESS,
  iban: "DE76250202000004445556",
};

export const DEMO_FAMILY_MUTTER: DemoFamilyParent = {
  email:
    process.env.SEED_DEMO_FAMILY_MUTTER_EMAIL ??
    "mutter.musterfamilie@jan-herwig.de",
  password: DEMO_FAMILY_PASSWORD,
  name: "Mutter Musterfamilie",
  firstName: "Mutter",
  lastName: "Musterfamilie",
  birthDate: new Date("1987-09-03"),
  ...DEMO_FAMILY_ADDRESS,
  iban: "DE40760200700005556667",
};

/** ~14 Jahre alt zum Zeitpunkt des Anlegens — Beitragskategorie "jung". */
export const DEMO_FAMILY_JUNGSOHN: DemoFamilyChild = {
  firstName: "JungSohn",
  lastName: "Musterfamilie",
  birthDate: new Date("2012-02-15"),
  email:
    process.env.SEED_DEMO_FAMILY_JUNGSOHN_EMAIL ??
    "jungsohn.musterfamilie@jan-herwig.de",
  ...DEMO_FAMILY_ADDRESS,
};

/** ~7 Jahre alt zum Zeitpunkt des Anlegens — Beitragskategorie "mini". */
export const DEMO_FAMILY_MINITOCHTER: DemoFamilyChild = {
  firstName: "MiniTochter",
  lastName: "Musterfamilie",
  birthDate: new Date("2019-06-01"),
  email: null,
  ...DEMO_FAMILY_ADDRESS,
};
