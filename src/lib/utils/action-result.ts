import { unstable_rethrow } from "next/navigation";

/**
 * Basis für Fehler, deren Meldung bewusst in der UI erscheinen darf (#519) —
 * fachliche Ablehnungen wie „Keine Kassenberechtigung" oder ein
 * `HoldingConflictError`. Alles andere (Prisma, Netzwerk, Bugs) bekommt eine
 * generische Meldung, damit keine Interna im Client landen.
 */
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserFacingError";
  }
}

const GENERIC_ERROR_MESSAGE = "Unbekannter Fehler.";

/**
 * Für jeden catch-all-Block einer Server Action: lässt Next-Interrupts
 * (`redirect()`, `notFound()`, …) zuerst durch — sonst landet „NEXT_REDIRECT"
 * statt des Login-Redirects als Fehlermeldung in der UI (#519).
 */
export function actionErrorMessage(error: unknown): string {
  unstable_rethrow(error);
  if (error instanceof UserFacingError) return error.message;
  console.error(error);
  return GENERIC_ERROR_MESSAGE;
}

/** Führt eine Server-Action-Operation aus und übersetzt Fehler per
 * `actionErrorMessage` in ein `{ error }`-Ergebnis. */
export async function toResult<T>(
  run: () => Promise<T> | T,
  onSuccess?: (value: T) => Promise<void> | void,
) {
  try {
    const value = await run();
    if (onSuccess) await onSuccess(value);
    return { success: true as const, value };
  } catch (error) {
    return { error: actionErrorMessage(error) };
  }
}
