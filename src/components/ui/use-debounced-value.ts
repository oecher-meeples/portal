import { useEffect, useState } from "react";

const DEFAULT_DELAY_MS = 300;

/** Returns `value`, but only updates after `delayMs` of no further changes. */
export function useDebouncedValue<T>(
  value: T,
  delayMs: number = DEFAULT_DELAY_MS,
): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}
