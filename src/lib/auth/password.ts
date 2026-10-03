/**
 * Password policy (length only). Single source of truth: `src/lib/auth/config.ts`
 * passes these limits to better-auth (`minPasswordLength`/`maxPasswordLength`),
 * and the UI checks them up front so users get a precise German message
 * instead of better-auth's English "Password too short/long" error.
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
    case "Password too short":
    case "Password too long":
      return `Das Passwort muss zwischen ${MIN_PASSWORD_LENGTH} und ${MAX_PASSWORD_LENGTH} Zeichen lang sein.`;
    case "Email address already registered":
    case "User already exists":
    case "User already exists. Use another email.":
      return "Für diese E-Mail-Adresse besteht bereits ein Konto.";
    case "Invalid email address format":
      return "Bitte gib eine gültige E-Mail-Adresse ein.";
    case "Invalid email or password":
      return "E-Mail-Adresse oder Passwort ist falsch.";
    default:
      return "Das hat leider nicht funktioniert. Bitte versuche es erneut.";
  }
}
