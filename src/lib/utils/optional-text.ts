/** `null` for blank/whitespace-only input, the trimmed value otherwise —
 * shared normalisation for every optional free-text profile field. */
export function optionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Like {@link optionalText}, additionally strips a leading `@` — for handle
 * fields (Telegram, Discord, …) where users often paste the `@name` form. */
export function optionalHandle(value: string | null | undefined) {
  const trimmed = value?.trim().replace(/^@+/, "");
  return trimmed ? trimmed : null;
}
