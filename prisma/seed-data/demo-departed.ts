/**
 * Zwei Demo-Fälle für die Mitgliedschafts-Endzustände (`getMembershipState()`,
 * `src/lib/members/anonymisation.ts`), die sonst nur nach echten Austritten
 * in Produktion auftauchen:
 *
 * - {@link DEMO_RESIGNED_MEMBER}: ausgetreten (`resignedAt`/`membershipEndsAt`
 *   in der Vergangenheit), aber noch nicht anonymisiert — Login und `Member`
 *   bestehen weiter, testet den "Stufe 2 auslösen"-Weg im Admin-Bereich.
 * - {@link DEMO_ANONYMISED_MEEPLE}: bereits Stufe 2 durchlaufen — kein Login,
 *   kein verknüpftes `Member` mehr (`Member.meepleId` wird dabei laut
 *   `anonymiseMeepleStufe2()` auf `null` gesetzt), keine Personendaten außer
 *   `anonymizedAt`.
 */

export const DEMO_RESIGNED_MEMBER = {
  email: "klaus.ausgetreten@jan-herwig.de",
  password: process.env.SEED_DEMO_PASSWORD ?? "demo1234",
  name: "Klaus Ausgetreten",
  firstName: "Klaus",
  lastName: "Ausgetreten",
  birthDate: new Date("1975-06-30"),
  street: "Lombardenstraße 22",
  postalCode: "52070",
  city: "Aachen",
  iban: "DE20390500000009998887",
  joinedAt: new Date("2018-03-01"),
  resignedAt: new Date("2025-11-01"),
  /** Kündigung im November 2025, keine 4 Wochen mehr bis zum Jahreswechsel
   * → wirksam erst zum übernächsten Jahreswechsel wäre falsch; hier: mit
   * ausreichend Vorlauf gekündigt, wirksam zum 01.01.2026 (`computeMembershipEndsAt`-Logik)
   * — liegt vor "heute" im Seed-Kontext, Status damit "ausgetreten". */
  membershipEndsAt: new Date("2026-01-01"),
} as const;

export const DEMO_ANONYMISED_MEEPLE = {
  id: "demo-anonymised-alt-meeple",
  joinedAt: new Date("2015-06-01"),
  anonymizedAt: new Date("2024-03-15"),
} as const;
