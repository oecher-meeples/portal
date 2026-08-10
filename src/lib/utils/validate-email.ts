// Deliberately permissive — good enough to reject typos and garbage input,
// not a full RFC 5322 implementation. `type="email"` already handles most
// of this in the browser; this is the check the server can't skip.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}
