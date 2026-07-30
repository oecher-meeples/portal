"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Shape every server action in this project returns on failure. */
export type ActionResult = { error?: string; success?: true } | void;

/**
 * Runs a server action with the pending/error/refresh bookkeeping that every
 * mutating component needs, so views don't each re-implement it.
 * Fachfrei — knows nothing about what the action does.
 */
export function useAction(options?: {
  /** Call router.refresh() after a successful run. Default: true. */
  refresh?: boolean;
  onSuccess?: () => void;
}) {
  const { refresh = true, onSuccess } = options ?? {};
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<ActionResult>) {
    setError(null);
    setPending(true);
    try {
      const result = await action();
      if (result && "error" in result && result.error) {
        setError(result.error);
        return false;
      }
      onSuccess?.();
      if (refresh) router.refresh();
      return true;
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unbekannter Fehler.",
      );
      return false;
    } finally {
      setPending(false);
    }
  }

  return { run, pending, error, setError };
}
