/**
 * Password policy enforced by Neon Auth (Better Auth default: length only,
 * not configurable via `createNeonAuth()` — see `docs/adr` for background).
 * Mirrored here so the UI can tell users exactly what's missing instead of
 * surfacing Neon Auth's generic "Password does not meet security
 * requirements" (WeakPassword) error, which collapses "too short" and "too
 * long" into one unhelpful message.
 */
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

/** Returns a precise German error message, or `null` if the password is valid. */
export function validatePassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Das Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Das Passwort darf höchstens ${MAX_PASSWORD_LENGTH} Zeichen lang sein.`;
  }
  return null;
}

/**
 * Translates the auth SDK's English error messages to German. Falls back to
 * a generic message for cases we don't specifically handle.
 */
export function translateAuthError(message: string | undefined): string {
  switch (message) {
    case "Password does not meet security requirements":
      return `Das Passwort muss zwischen ${MIN_PASSWORD_LENGTH} und ${MAX_PASSWORD_LENGTH} Zeichen lang sein.`;
    case "Email address already registered":
    case "User already exists":
      return "Für diese E-Mail-Adresse besteht bereits ein Konto.";
    case "Invalid email address format":
      return "Bitte gib eine gültige E-Mail-Adresse ein.";
    case "Invalid email or password":
      return "E-Mail-Adresse oder Passwort ist falsch.";
    default:
      return "Das hat leider nicht funktioniert. Bitte versuche es erneut.";
  }
}
