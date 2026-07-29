const STATE_COOKIE_NAME = "instagram_oauth_state";

export function generateState(): string {
  return crypto.randomUUID();
}

export function buildStateCookie(state: string): string {
  return `${STATE_COOKIE_NAME}=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`;
}

export function clearStateCookie(): string {
  return `${STATE_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function readStateFromCookieHeader(
  cookieHeader: string | null,
): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${STATE_COOKIE_NAME}=`));
  return match ? match.slice(STATE_COOKIE_NAME.length + 1) : null;
}
