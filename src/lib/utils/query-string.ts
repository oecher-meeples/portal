/** Merges a patch into the current search params and returns the resulting URL. */
export function buildHref(
  basePath: string,
  current: Record<string, string | string[] | undefined>,
  patch: Record<string, string | string[] | undefined>,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(current)) {
    if (key in patch || value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) params.append(key, v);
    } else {
      params.set(key, value);
    }
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) params.append(key, v);
    } else {
      params.set(key, value);
    }
  }
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}
