import { prisma } from "@/lib/utils/prisma";

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

/** Fixer Cooldown zwischen zwei Aufrufen desselben Keys (#326, Mechanismus 1)
 * — reiner Spam-/Lastschutz, kein Brute-Force-Schutz für sich genommen. */
export async function checkFixedCooldown(
  key: string,
  cooldownSeconds: number,
): Promise<RateLimitResult> {
  const now = new Date();
  const row = await prisma.rateLimitAttempt.findUnique({ where: { key } });

  if (row) {
    const elapsedSecs = (now.getTime() - row.lastFailedAt.getTime()) / 1000;
    if (elapsedSecs < cooldownSeconds) {
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil(cooldownSeconds - elapsedSecs),
      };
    }
  }

  await prisma.rateLimitAttempt.upsert({
    where: { key },
    create: { key, lastFailedAt: now },
    update: { lastFailedAt: now },
  });
  return { allowed: true };
}

/** Feste Mengenbegrenzung pro Key innerhalb eines gleitenden Fensters (#326,
 * Mechanismus 3, z. B. `revealIban`). Blockt statt nur zu protokollieren,
 * sobald `maxCalls` innerhalb von `windowSeconds` überschritten wird. */
export async function checkAndRecordCountLimit(
  key: string,
  maxCalls: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const now = new Date();
  const row = await prisma.rateLimitAttempt.findUnique({ where: { key } });

  const windowElapsedSecs = row
    ? (now.getTime() - row.lastFailedAt.getTime()) / 1000
    : Infinity;
  const windowExpired = windowElapsedSecs >= windowSeconds;
  const countInWindow = windowExpired ? 0 : (row?.failCount ?? 0);

  if (countInWindow >= maxCalls) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(windowSeconds - windowElapsedSecs),
    };
  }

  await prisma.rateLimitAttempt.upsert({
    where: { key },
    create: { key, failCount: 1, lastFailedAt: now },
    update: {
      failCount: countInWindow + 1,
      // Fensterstart nur beim allerersten Aufruf im (neuen) Fenster setzen —
      // sonst würde jeder weitere Aufruf das Fenster verlängern (kein echtes
      // Sliding Window, aber ein festes Fenster reicht für diesen Zweck).
      lastFailedAt: windowExpired ? now : row!.lastFailedAt,
    },
  });
  return { allowed: true };
}

const LOGIN_BACKOFF_FREE_ATTEMPTS = 3;
const LOGIN_BACKOFF_CAP_SECONDS = 8 * 60 * 60; // 8h
const LOGIN_BACKOFF_IDLE_RESET_SECONDS = 10 * 60 * 60; // 10h, bewusst > Deckel — s. #326

function computeCooldownSecs(failCount: number): number {
  if (failCount <= LOGIN_BACKOFF_FREE_ATTEMPTS) return 0;
  return Math.min(
    2 ** (failCount - LOGIN_BACKOFF_FREE_ATTEMPTS - 1),
    LOGIN_BACKOFF_CAP_SECONDS,
  );
}

/** Exponentielles Backoff pro E-Mail-Schlüssel für den Login (#326,
 * Mechanismus 2) — nur lesend, konsumiert keinen Versuch. Eine harte,
 * manuell gesetzte Sperre (#327) blockt unabhängig vom Zähler und wird
 * NICHT durch den 10h-Idle-Reset aufgehoben — nur durch eine explizite
 * Admin-Aktion (`clearManualLoginLock`). */
export async function checkLoginBackoff(
  emailKey: string,
): Promise<RateLimitResult> {
  const row = await prisma.rateLimitAttempt.findUnique({
    where: { key: emailKey },
  });
  if (!row) return { allowed: true };

  if (row.manuallyLockedAt) {
    return { allowed: false, retryAfterSeconds: Infinity };
  }

  const idleSecs = (Date.now() - row.lastFailedAt.getTime()) / 1000;
  if (idleSecs >= LOGIN_BACKOFF_IDLE_RESET_SECONDS) return { allowed: true };
  if (idleSecs < row.currentCooldownSecs) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(row.currentCooldownSecs - idleSecs),
    };
  }
  return { allowed: true };
}

/** Auf dem Fehlpfad des Logins aufrufen — erhöht den Zähler und berechnet
 * den neuen Cooldown. `ip` wird für den Reset-Trigger "erfolgreicher Login
 * von derselben IP" gespeichert. */
export async function recordLoginFailure(
  emailKey: string,
  ip: string | null,
): Promise<void> {
  const now = new Date();
  const row = await prisma.rateLimitAttempt.findUnique({
    where: { key: emailKey },
  });

  const idleSecs = row
    ? (now.getTime() - row.lastFailedAt.getTime()) / 1000
    : Infinity;
  const priorFailCount =
    row && idleSecs < LOGIN_BACKOFF_IDLE_RESET_SECONDS ? row.failCount : 0;
  const failCount = priorFailCount + 1;

  await prisma.rateLimitAttempt.upsert({
    where: { key: emailKey },
    create: {
      key: emailKey,
      failCount,
      currentCooldownSecs: computeCooldownSecs(failCount),
      lastFailedAt: now,
      lastFailedIp: ip,
    },
    update: {
      failCount,
      currentCooldownSecs: computeCooldownSecs(failCount),
      lastFailedAt: now,
      lastFailedIp: ip,
    },
  });
}

/** Reset-Trigger 1: erfolgreicher Login von derselben IP wie der letzte
 * Fehlversuch. No-op, falls kein Fehlversuch-Datensatz existiert oder die
 * IP nicht übereinstimmt (#326). */
export async function resetLoginBackoffIfSameIp(
  emailKey: string,
  ip: string | null,
): Promise<void> {
  const row = await prisma.rateLimitAttempt.findUnique({
    where: { key: emailKey },
  });
  if (!row || row.failCount === 0) return;
  if (!ip || row.lastFailedIp !== ip) return;

  await prisma.rateLimitAttempt.update({
    where: { key: emailKey },
    data: { failCount: 0, currentCooldownSecs: 0 },
  });
}

/** Für Admin-Dashboard/Danger-Hinweis (#327-Vorarbeit): true, sobald der
 * 8h-Deckel für den gegebenen Login-Key erreicht ist. */
export async function hasReachedLoginBackoffCap(
  emailKey: string,
): Promise<boolean> {
  const row = await prisma.rateLimitAttempt.findUnique({
    where: { key: emailKey },
  });
  return row?.currentCooldownSecs === LOGIN_BACKOFF_CAP_SECONDS;
}

export type LoginBackoffStatus = {
  failCount: number;
  currentCooldownSecs: number;
  atCap: boolean;
  manuallyLockedAt: Date | null;
  lastFailedAt: Date | null;
};

/** Für die Rate-Limit-Verwaltung in `/admin/mitglieder` (#327). */
export async function getLoginBackoffStatus(
  emailKey: string,
): Promise<LoginBackoffStatus> {
  const row = await prisma.rateLimitAttempt.findUnique({
    where: { key: emailKey },
  });
  return {
    failCount: row?.failCount ?? 0,
    currentCooldownSecs: row?.currentCooldownSecs ?? 0,
    atCap: row?.currentCooldownSecs === LOGIN_BACKOFF_CAP_SECONDS,
    manuallyLockedAt: row?.manuallyLockedAt ?? null,
    lastFailedAt: row?.lastFailedAt ?? null,
  };
}

/** Admin-Reset (#327) — im Unterschied zu `resetLoginBackoffIfSameIp` auch
 * ohne IP-Übereinstimmung, und hebt zusätzlich eine harte Sperre auf. */
export async function adminResetLoginBackoff(emailKey: string): Promise<void> {
  await prisma.rateLimitAttempt.upsert({
    where: { key: emailKey },
    create: { key: emailKey },
    update: { failCount: 0, currentCooldownSecs: 0, manuallyLockedAt: null },
  });
}

/** Harte Sperre (#327) — unabhängig vom Fibonacci-artigen Zähler, bleibt
 * bestehen, bis sie explizit per `adminResetLoginBackoff` aufgehoben wird. */
export async function setManualLoginLock(emailKey: string): Promise<void> {
  const now = new Date();
  await prisma.rateLimitAttempt.upsert({
    where: { key: emailKey },
    create: { key: emailKey, manuallyLockedAt: now },
    update: { manuallyLockedAt: now },
  });
}
