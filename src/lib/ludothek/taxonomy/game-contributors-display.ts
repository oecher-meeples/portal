import type { ContributorRole } from "@prisma/client";

export type GameContributorDisplay = { name: string; roles: ContributorRole[] };

/** Fasst die separaten `publisher`/`author`/`illustrator`-Namenslisten eines
 * Titels zu einer Liste pro Name mit allen seinen Rollen an diesem Titel
 * zusammen — für `ContributorPill`, die Name und Rollen-Icons zusammen
 * zeigt. Reihenfolge: zuerst Verlage, dann Autoren, dann Illustratoren,
 * jeder Name nur einmal. */
export function groupGameContributorsByName(game: {
  publisher: string[];
  author: string[];
  illustrator: string[];
}): GameContributorDisplay[] {
  const rolesByName = new Map<string, ContributorRole[]>();
  const order: string[] = [];

  function add(names: string[], role: ContributorRole) {
    for (const name of names) {
      const roles = rolesByName.get(name);
      if (roles) {
        if (!roles.includes(role)) roles.push(role);
      } else {
        rolesByName.set(name, [role]);
        order.push(name);
      }
    }
  }

  add(game.publisher, "PUBLISHER");
  add(game.author, "AUTHOR");
  add(game.illustrator, "ILLUSTRATOR");

  return order.map((name) => ({ name, roles: rolesByName.get(name)! }));
}

/** Ab dieser Anzahl reiner Illustratoren werden sie auf der Detailseite aus
 * dem Kopfbereich in eine eigene, eingeklappte Karte ausgelagert. */
export const ILLUSTRATOR_CARD_THRESHOLD = 5;

const isIllustratorOnly = (contributor: GameContributorDisplay) =>
  contributor.roles.length === 1 && contributor.roles[0] === "ILLUSTRATOR";

/** Teilt die Mitwirkenden für die Detailseite: `inline` bleibt im Kopfbereich,
 * `illustrators` ist nur gefüllt, wenn es mehr als
 * `ILLUSTRATOR_CARD_THRESHOLD` reine Illustratoren gibt (sonst bleiben sie
 * inline). Wer neben der Illustration eine weitere Rolle hat, bleibt immer
 * inline. */
export function splitContributorsForDetail(
  contributors: GameContributorDisplay[],
): {
  inline: GameContributorDisplay[];
  illustrators: GameContributorDisplay[];
} {
  const illustrators = contributors.filter(isIllustratorOnly);
  if (illustrators.length <= ILLUSTRATOR_CARD_THRESHOLD) {
    return { inline: contributors, illustrators: [] };
  }
  return {
    inline: contributors.filter((c) => !isIllustratorOnly(c)),
    illustrators,
  };
}
