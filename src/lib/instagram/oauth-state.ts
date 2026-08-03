import { createHmac, timingSafeEqual } from "node:crypto";

const STATE_COOKIE_NAME = "instagram_oauth_state";

function sign(userId: string, nonce: string): string {
  const secret = process.env.NEON_AUTH_COOKIE_SECRET ?? "";
  return createHmac("sha256", secret)
    .update(`${userId}:${nonce}`)
    .digest("hex");
}

export function generateState(): string {
  return crypto.randomUUID();
}

/**
 * Binds the OAuth state to the session that started the flow, not just to
 * "whatever the cookie says" — a cookie-tossing attacker who can only set a
 * cookie (not read the session) can't forge a matching signature.
 */
export function buildStateCookie(userId: string, state: string): string {
  const signature = sign(userId, state);
  return `${STATE_COOKIE_NAME}=${state}.${signature}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=600`;
}

export function clearStateCookie(): string {
  return `${STATE_COOKIE_NAME}=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0`;
}

/**
 * Verifies that `queryState` (the `state` query param returned by Meta)
 * matches the cookie AND was signed for `userId` — the current session.
 */
export function verifyState(
  cookieHeader: string | null,
  queryState: string | null,
  userId: string,
): boolean {
  if (!cookieHeader || !queryState) return false;
  const raw = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${STATE_COOKIE_NAME}=`));
  if (!raw) return false;
  const cookieValue = raw.slice(STATE_COOKIE_NAME.length + 1);
  const [nonce, signature] = cookieValue.split(".");
  if (!nonce || !signature || nonce !== queryState) return false;

  const expected = Buffer.from(sign(userId, nonce));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
