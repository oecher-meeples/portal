import { BoardGameTrait, BoardGameTraitTone } from "@prisma/client";
import { Smartphone, type LucideIcon } from "lucide-react";

/** Darstellungsform je Trait (#487-Konzept) — hardcodiert, nicht
 * admin-editierbar: Pill-vs-Icon ist eine Design-Entscheidung, verzahnt mit
 * der Icon-Komponente, kein Wortlaut/keine Dringlichkeit (das steckt in
 * `BoardGameTraitText`, admin-editierbar, siehe `board-game-trait-texts.ts`).
 * `DIGITAL_HYBRID` ist der einzige Icon-Trait — BGGs Signal dafür ist bekannt
 * unzuverlässig ("zwingend" vs. "optional"), ein dezentes Icon mit Tooltip
 * passt besser als eine Pill, die Verbindlichkeit suggeriert. */
export const TRAIT_RENDER_CONFIG: Record<
  BoardGameTrait,
  { variant: "pill" } | { variant: "icon"; icon: LucideIcon }
> = {
  [BoardGameTrait.LEGACY]: { variant: "pill" },
  [BoardGameTrait.CAMPAIGN]: { variant: "pill" },
  [BoardGameTrait.LIMITED_REPLAYABILITY]: { variant: "pill" },
  [BoardGameTrait.SOLITAIRE_SUPPORTED]: { variant: "pill" },
  [BoardGameTrait.DIGITAL_HYBRID]: { variant: "icon", icon: Smartphone },
};

/** Feste Fallback-Bezeichnung je Trait — für das Admin-Formular (Mehrfach-
 * auswahl beim Titel-Bearbeiten) und als Pill-Text, falls der admin-editierbare
 * `BoardGameTraitText.label` (noch) leer ist. Bewusst getrennt vom DB-`label`:
 * der Admin soll einen Trait immer eindeutig benennen können, auch bevor er
 * die Anzeige-Texte das erste Mal gepflegt hat. */
export const BOARD_GAME_TRAIT_FALLBACK_LABELS: Record<BoardGameTrait, string> =
  {
    [BoardGameTrait.LEGACY]: "Legacy",
    [BoardGameTrait.CAMPAIGN]: "Kampagne",
    [BoardGameTrait.LIMITED_REPLAYABILITY]: "Begrenzte Wiederspielbarkeit",
    [BoardGameTrait.SOLITAIRE_SUPPORTED]: "Solo spielbar",
    [BoardGameTrait.DIGITAL_HYBRID]: "App/Website-Bezug",
  };

export const BOARD_GAME_TRAIT_OPTIONS = Object.values(BoardGameTrait);

/** Nur die Anzeige-Felder aus `BoardGameTraitText` — als eigener Typ statt
 * eines Prisma-Imports des vollen Modells, damit dieses Modul (potenziell
 * auch clientseitig, z. B. für `TRAIT_RENDER_CONFIG`) keine Prisma-Query-Typen
 * mitschleppt. */
export type BoardGameTraitTextData = {
  trait: BoardGameTrait;
  label: string | null;
  tooltip: string | null;
  tone: BoardGameTraitTone;
  loanMessage: string | null;
  detailsMessage: string | null;
};

/** Ein Trait, vollständig aufgelöst für die Anzeige — Merge aus
 * `TRAIT_RENDER_CONFIG` (Code, Darstellungsform) und `BoardGameTraitText`
 * (DB, Wortlaut/Ton). Die eine generische Stelle, die beides zusammenführt —
 * Rendering-Code fragt nie `if (trait === "DIGITAL_HYBRID")`. */
export type ResolvedBoardGameTrait = {
  trait: BoardGameTrait;
  variant: "pill" | "icon";
  icon?: LucideIcon;
  /** Pill-Text (variant "pill") bzw. Tooltip-Titel (variant "icon") — nie
   * leer, fällt auf `BOARD_GAME_TRAIT_FALLBACK_LABELS` zurück. */
  label: string;
  tooltip: string | null;
  tone: BoardGameTraitTone;
  loanMessage: string | null;
  detailsMessage: string | null;
};

/** Löst `game.traits` gegen `TRAIT_RENDER_CONFIG` + die geladenen
 * `BoardGameTraitText`-Zeilen auf — ignoriert Traits ohne Text-Zeile nicht,
 * sondern fällt auf Default-Ton/Fallback-Label zurück, damit ein frisch per
 * Migration gesetzter Trait ohne Seed-Lauf trotzdem anzeigbar bleibt.
 *
 * `textsByTrait` ist bewusst ein einfaches Objekt statt einer `Map` — das
 * hält den Rückgabewert von `loadBoardGameTraitTextsByTrait()` als Server-
 * Component-Prop an eine Client-Komponente (z. B. `GameListRow`) serialisierbar. */
export function resolveBoardGameTraits(
  traits: BoardGameTrait[],
  textsByTrait: Partial<Record<BoardGameTrait, BoardGameTraitTextData>>,
): ResolvedBoardGameTrait[] {
  return traits.map((trait) => {
    const config = TRAIT_RENDER_CONFIG[trait];
    const text = textsByTrait[trait];
    return {
      trait,
      variant: config.variant,
      icon: config.variant === "icon" ? config.icon : undefined,
      label: text?.label || BOARD_GAME_TRAIT_FALLBACK_LABELS[trait],
      tooltip: text?.tooltip ?? null,
      tone: text?.tone ?? BoardGameTraitTone.INFO,
      loanMessage: text?.loanMessage ?? null,
      detailsMessage: text?.detailsMessage ?? null,
    };
  });
}
