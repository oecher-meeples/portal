/** Same normalisation for every slugged model (BoardGame, Event, …) — one place, no duplicate rules. */
export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/** Appends -2, -3, … to the base slug until `isTaken` reports it as free. */
export async function uniqueSlug(
  title: string,
  isTaken: (slug: string) => Promise<boolean>,
) {
  const base = slugify(title);
  let slug = base;
  let suffix = 2;

  while (await isTaken(slug)) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  return slug;
}
