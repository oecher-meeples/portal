/**
 * Displayname des dauerhaften Sammelkontos "Anonymer Meeple" (#333) — Ziel
 * jeder "an extern weitergegeben"-Aktion, deren Empfänger:in kein eigenes
 * Vereinsmitglied ist (siehe `holdings-external.ts::handOverToExternal`).
 * Geteilt zwischen Seed-Skript und Anwendung, statt einer eigenen
 * Flag-Spalte auf `Meeple`/`Member` — es gibt bewusst genau ein Sammelkonto,
 * kein nummeriertes Kontingent (siehe Kommentar in `prisma/seed.ts`).
 * Eigenes Modul ohne Prisma-Import, damit auch Client-Komponenten (Scanner,
 * #540) den Namen nutzen können.
 */
export const ANONYMER_MEEPLE_NAME = "Anonymer Meeple";
