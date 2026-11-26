export type ErklaerbaerenTab = "meine" | "verzeichnis";

export function parseErklaerbaerenTab(
  value: string | undefined,
): ErklaerbaerenTab {
  return value === "verzeichnis" ? "verzeichnis" : "meine";
}

/** Zustand der Seite steckt in der URL (Tab, Filter, Suche) — so kann die
 * Dashboard-Card (#666) direkt `?filter=gesucht` öffnen. */
export function erklaerbaerenHref({
  tab = "meine",
  filter,
  q,
}: {
  tab?: ErklaerbaerenTab;
  filter?: string;
  q?: string;
}): string {
  const params = new URLSearchParams();
  if (tab !== "meine") params.set("tab", tab);
  if (filter) params.set("filter", filter);
  if (q) params.set("q", q);
  const query = params.toString();
  return query ? `/erklaerbaeren?${query}` : "/erklaerbaeren";
}
