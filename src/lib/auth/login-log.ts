import { headers } from "next/headers";
import { prisma } from "@/lib/utils/prisma";
import { getRequestIp } from "@/lib/utils/request-ip";

/** Retention analog zu `BANK_LOG_RETENTION_MONTHS` (docs/adr/0003) — s.
 * Schema-Kommentar auf `LoginLog` (#231). */
export const LOGIN_LOG_RETENTION_MONTHS = 24;

export function loginLogCutoff(now: Date = new Date()) {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - LOGIN_LOG_RETENTION_MONTHS);
  return cutoff;
}

export async function deleteExpiredLoginLogs(now: Date = new Date()) {
  const { count } = await prisma.loginLog.deleteMany({
    where: { at: { lt: loginLogCutoff(now) } },
  });
  return { deleted: count };
}

/**
 * Protokolliert einen Login für ein `admin:access`-Konto — idempotent pro
 * Session: `sessionCreatedAt` identifiziert die Session eindeutig genug
 * (kollisionsfrei innerhalb desselben Kontos), sodass ein wiederholter
 * Aufruf über mehrere Seitenaufrufe derselben Session hinweg keinen
 * zweiten Eintrag erzeugt. Aufgerufen aus `requireAdminPermission()`
 * (Server Component) — Credentials- und Google-SSO-Logins gleichermaßen,
 * da beide auf dieselbe Session-Form hinauslaufen (#231).
 */
export async function logAdminLoginOnce(
  neonAuthUserId: string,
  sessionCreatedAt: Date,
) {
  const existing = await prisma.loginLog.findFirst({
    where: { neonAuthUserId, at: sessionCreatedAt },
    select: { id: true },
  });
  if (existing) return;

  const [ip, headerList] = await Promise.all([getRequestIp(), headers()]);
  await prisma.loginLog.create({
    data: {
      neonAuthUserId,
      at: sessionCreatedAt,
      ipAddress: ip,
      userAgent: headerList.get("user-agent"),
    },
  });
}

/** Für die Login-Historie im Admin-Bereich — nur für `admin:access`
 * einsehbar (#231), s. Aufrufstelle. */
export async function getRecentAdminLogins(limit = 20) {
  return prisma.loginLog.findMany({
    orderBy: { at: "desc" },
    take: limit,
  });
}
