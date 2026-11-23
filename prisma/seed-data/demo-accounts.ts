/**
 * Login- und Member-Stammdaten für die festen Demo-/Test-Accounts (Admin,
 * Rollen-Accounts, Demo-Meeples). Bis #297-Nachzügler-Fix (siehe Seed-Korrektur
 * production-Reseed) bekamen diese nur ein `Meeple` (Login), kein begleitendes
 * `Member` (Vereinsmitgliedschaft, #328) — jetzt vollständig, inkl. Adresse und
 * IBAN, analog zur Musterfamilie (`demo-family.ts`).
 */

export type DemoAccount = {
  email: string;
  password: string;
  name: string;
  firstName: string;
  lastName: string;
  birthDate: Date;
  street: string;
  postalCode: string;
  city: string;
  iban: string;
};

export const ADMIN_ACCOUNT: DemoAccount = {
  email: process.env.SEED_ADMIN_EMAIL ?? "admin@jan-herwig.de",
  password: process.env.SEED_ADMIN_PASSWORD ?? "admin",
  name: "Admin",
  firstName: "Admin",
  lastName: "Account",
  birthDate: new Date("1990-01-01"),
  street: "Pontstraße 3",
  postalCode: "52062",
  city: "Aachen",
  iban: "DE27370501980000012345",
};

export const DEMO_MEEPLE_1: DemoAccount = {
  email: process.env.SEED_DEMO_MEEPLE_1_EMAIL ?? "demo1@jan-herwig.de",
  password: process.env.SEED_DEMO_PASSWORD ?? "demo1234",
  name: "Lea Demo",
  firstName: "Lea",
  lastName: "Demo",
  birthDate: new Date("1996-03-22"),
  street: "Roermonder Straße 45",
  postalCode: "52072",
  city: "Aachen",
  iban: "DE37300205000002223334",
};

export const DEMO_MEEPLE_2: DemoAccount = {
  email: process.env.SEED_DEMO_MEEPLE_2_EMAIL ?? "demo2@jan-herwig.de",
  password: process.env.SEED_DEMO_MEEPLE_2_PASSWORD ?? "demo1234",
  name: "Tobias Demo",
  firstName: "Tobias",
  lastName: "Demo",
  birthDate: new Date("1993-11-08"),
  street: "Vaalser Straße 100",
  postalCode: "52074",
  city: "Aachen",
  iban: "DE21370400440003334445",
};

/**
 * Ein Demo-Account je Vereinsamt, damit sich jede Rolle ohne Rechte-Rätselraten
 * durchklicken lässt — Name ist zugleich der Rollenname (siehe seed-roles.ts).
 */
export const DEMO_ROLE_ACCOUNTS: (DemoAccount & { role: string })[] = [
  {
    role: "Vorstand",
    email: "vorstand@oecher-meeples.org",
    street: "Jakobstraße 20",
    postalCode: "52064",
    iban: "DE60300606010001234567",
    birthDate: new Date("1978-05-14"),
  },
  {
    role: "Kassenwart",
    email: "kassenwart@oecher-meeples.org",
    street: "Adalbertstraße 8",
    postalCode: "52070",
    iban: "DE80500105170000456789",
    birthDate: new Date("1982-09-30"),
  },
  {
    role: "Spielewart",
    email: "spielewart@oecher-meeples.org",
    street: "Turmstraße 15",
    postalCode: "52072",
    iban: "DE18100900000009876543",
    birthDate: new Date("1988-02-17"),
  },
  {
    role: "Redakteur",
    email: "redakteur@oecher-meeples.org",
    street: "Kármánstraße 5",
    postalCode: "52062",
    iban: "DE26250501800001112223",
    birthDate: new Date("1991-07-25"),
  },
].map(({ role, email, street, postalCode, iban, birthDate }) => ({
  role,
  name: role,
  firstName: role,
  lastName: "Demo",
  email,
  password: process.env.SEED_DEMO_PASSWORD ?? "demo1234",
  street,
  postalCode,
  city: "Aachen",
  iban,
  birthDate,
}));
