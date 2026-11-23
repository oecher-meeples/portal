/** Client-side search matching for the admin-bestand table (see {@link AdminBestandView}). */
export function matchesAdminBestandSearch(
  game: {
    title: string;
    ean: string | null;
    bggId: number | null;
    /** BGG-Alternativnamen, z. B. der deutsche Titel neben einem englischen
     * `title` — matcht genauso wie der Titel selbst (#187). */
    alternateNames?: string[];
  },
  search: string,
): boolean {
  const term = search.trim().toLowerCase();
  if (!term) return true;

  if (game.title.toLowerCase().includes(term)) return true;
  if (game.ean !== null && game.ean === search.trim()) return true;
  if (game.bggId !== null && String(game.bggId) === search.trim()) return true;
  if (game.alternateNames?.some((name) => name.toLowerCase().includes(term)))
    return true;

  return false;
}
