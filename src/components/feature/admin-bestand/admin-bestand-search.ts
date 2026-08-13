/** Client-side search matching for the admin-bestand table (see {@link AdminBestandView}). */
export function matchesAdminBestandSearch(
  game: { title: string; ean: string | null; bggId: number | null },
  search: string,
): boolean {
  const term = search.trim().toLowerCase();
  if (!term) return true;

  if (game.title.toLowerCase().includes(term)) return true;
  if (game.ean !== null && game.ean === search.trim()) return true;
  if (game.bggId !== null && String(game.bggId) === search.trim()) return true;

  return false;
}
