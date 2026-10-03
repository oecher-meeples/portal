import { BoardGameTrait, BoardGameTraitTone } from "@prisma/client";
import { prisma } from "../src/lib/utils/prisma";

/** Default-Anzeigetexte je Trait (#487-Konzept) — kein Demo-Content, sondern
 * Produktiv-Konfiguration: macht das Feature sofort nutzbar, ohne dass ein
 * Admin zuerst manuell durch die neue Settings-Seite gehen muss. Läuft daher
 * immer, unabhängig von den übrigen (Demo-)Seed-Schritten. */
const TRAIT_TEXT_DEFAULTS: Record<
  BoardGameTrait,
  {
    label?: string;
    tooltip?: string;
    tone: BoardGameTraitTone;
    loanMessage?: string;
    detailsMessage?: string;
  }
> = {
  [BoardGameTrait.LEGACY]: {
    label: "Legacy",
    tone: BoardGameTraitTone.WARNING,
    loanMessage:
      "Legacy-Spiel — nach Durchspielen ggf. nicht mehr vollständig/neutral.",
    detailsMessage:
      "Dieses Spiel verändert sich dauerhaft beim Spielen (Legacy-Mechanik). Nach dem Durchspielen einer Kampagne ist es ggf. nicht mehr für einen Neustart geeignet.",
  },
  [BoardGameTrait.CAMPAIGN]: {
    label: "Kampagne",
    tone: BoardGameTraitTone.INFO,
    loanMessage:
      "Kampagnenspiel — mehrere Partien bauen aufeinander auf, Fortschritt ggf. nicht neutral.",
    detailsMessage:
      "Dieses Spiel ist auf eine Kampagne über mehrere Partien ausgelegt. Der Fortschritt kann zwischen Partien gespeichert werden.",
  },
  [BoardGameTrait.LIMITED_REPLAYABILITY]: {
    label: "Begrenzte Wiederspielbarkeit",
    tone: BoardGameTraitTone.WARNING,
    loanMessage:
      "Begrenzte Wiederspielbarkeit — nach mehreren Partien ggf. weniger reizvoll.",
    detailsMessage:
      "BGG stuft dieses Spiel als begrenzt wiederspielbar ein — der Reiz kann nach mehreren Partien nachlassen.",
  },
  [BoardGameTrait.SOLITAIRE_SUPPORTED]: {
    label: "Solo spielbar",
    tone: BoardGameTraitTone.INFO,
    detailsMessage: "Dieses Spiel bietet offizielle Regeln für Solo-Partien.",
  },
  [BoardGameTrait.DIGITAL_HYBRID]: {
    tooltip: "Begleitende App/Website laut BGG erforderlich",
    tone: BoardGameTraitTone.WARNING,
    loanMessage:
      "Für dieses Spiel wird laut BGG eine App/Website benötigt — ggf. aber optional, bitte vor Ausgabe prüfen.",
    detailsMessage:
      "BGG markiert dieses Spiel als auf eine begleitende App/Website angewiesen. Das ist nicht immer zuverlässig — je nach Titel kann die App auch nur optional sein.",
  },
};

export async function seedBoardGameTraitTexts() {
  for (const [trait, defaults] of Object.entries(TRAIT_TEXT_DEFAULTS) as [
    BoardGameTrait,
    (typeof TRAIT_TEXT_DEFAULTS)[BoardGameTrait],
  ][]) {
    await prisma.boardGameTraitText.upsert({
      where: { trait },
      update: {},
      create: { trait, ...defaults },
    });
  }

  console.log(
    `${Object.keys(TRAIT_TEXT_DEFAULTS).length} Board-Game-Trait-Texte angelegt/übersprungen.`,
  );
}
