/** Öffentliche BGG-Seite eines Spiels, `null` ohne BGG-ID. */
export function bggGameUrl(bggId: number | null | undefined): string | null {
  return bggId ? `https://boardgamegeek.com/boardgame/${bggId}` : null;
}
