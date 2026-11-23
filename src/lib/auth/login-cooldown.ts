const FREE_ATTEMPTS = 3;
const CAP_SECONDS = 8 * 60 * 60; // 8h — muss checkLoginBackoff()/computeCooldownSecs() aus rate-limit.ts spiegeln
const IDLE_RESET_SECONDS = 10 * 60 * 60; // 10h, bewusst > Deckel — s. rate-limit.ts

type StoredEntry = { failCount: number; lastFailedAt: number };

function storageKey(email: string) {
  return `login-cooldown:${email.trim().toLowerCase()}`;
}

/** Spiegelt computeCooldownSecs() aus rate-limit.ts (#326) — reine
 * Client-Näherung ohne Server-Bestätigung: der Server liefert nie preis, ob
 * ein Fehlversuch am Passwort oder am aktiven Cooldown lag (bewusste
 * Enumeration-Prävention, siehe route.test.ts:80). */
function computeCooldownSecs(failCount: number): number {
  if (failCount <= FREE_ATTEMPTS) return 0;
  return Math.min(2 ** (failCount - FREE_ATTEMPTS - 1), CAP_SECONDS);
}

function readEntry(email: string): StoredEntry | null {
  if (!email || typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(email));
    if (!raw) return null;
    return JSON.parse(raw) as StoredEntry;
  } catch {
    return null;
  }
}

/** Sekunden bis zum vermuteten Ende der Sperre für diese E-Mail — 0, wenn
 * gerade keine Sperre aktiv ist (oder der Idle-Reset bereits gegriffen hat).
 * Reine Näherung: kann bei Anfragen von einem anderen Gerät/Tab ungenau
 * sein, das ist akzeptiert (#425). */
export function getLoginCooldownSeconds(
  email: string,
  now = Date.now(),
): number {
  const entry = readEntry(email);
  if (!entry) return 0;

  const idleSecs = (now - entry.lastFailedAt) / 1000;
  if (idleSecs >= IDLE_RESET_SECONDS) return 0;

  const remaining = computeCooldownSecs(entry.failCount) - idleSecs;
  return remaining > 0 ? Math.ceil(remaining) : 0;
}

/** Nach einem Fehlversuch (falsches Passwort ODER aktiver Server-Cooldown —
 * ununterscheidbar, s.o.) aufrufen: erhöht den Zähler für diese E-Mail in
 * localStorage, analog recordLoginFailure() aus rate-limit.ts. */
export function recordLoginFailureClient(
  email: string,
  now = Date.now(),
): void {
  if (!email || typeof window === "undefined") return;
  const entry = readEntry(email);
  const idleSecs = entry ? (now - entry.lastFailedAt) / 1000 : Infinity;
  const priorFailCount =
    entry && idleSecs < IDLE_RESET_SECONDS ? entry.failCount : 0;

  try {
    localStorage.setItem(
      storageKey(email),
      JSON.stringify({
        failCount: priorFailCount + 1,
        lastFailedAt: now,
      } satisfies StoredEntry),
    );
  } catch {
    // localStorage kann ausfallen (privater Modus, Quota) — die Näherung
    // entfällt dann einfach, kein Blocker für den eigentlichen Login.
  }
}

/** Bei erfolgreichem Login aufrufen — löscht den Zähler für diese E-Mail
 * sofort (#425). */
export function clearLoginCooldown(email: string): void {
  if (!email || typeof window === "undefined") return;
  try {
    localStorage.removeItem(storageKey(email));
  } catch {
    // s.o.
  }
}
