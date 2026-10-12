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
