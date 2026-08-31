"use server";

import { prisma } from "@/lib/utils/prisma";
import { requirePermission } from "@/lib/auth/permissions";
import {
  adminResetLoginBackoff,
  getLoginBackoffStatus,
  setManualLoginLock,
  type LoginBackoffStatus,
} from "@/lib/utils/rate-limit";

/**
 * Login-Rate-Limit-Verwaltung in `/admin/mitglieder` (#327). Der Schlüssel
 * folgt derselben `login:email:<email>`-Konvention wie der Login selbst
 * (#326) — abgeleitet aus `Member.email` (dem Konto-Login), nicht aus einer
 * separaten Login-E-Mail-Spalte, da beide im heutigen Bestand identisch sind.
 */
async function loginKeyForMeeple(meepleId: string): Promise<string | null> {
  const member = await prisma.member.findUnique({
    where: { meepleId },
    select: { email: true },
  });
  if (!member?.email) return null;
  return `login:email:${member.email.trim().toLowerCase()}`;
}

export async function getMeepleLoginRateLimitStatus(
  meepleId: string,
): Promise<LoginBackoffStatus | { error: string }> {
  await requirePermission("members:manage");

  const key = await loginKeyForMeeple(meepleId);
  if (!key) return { error: "Für dieses Mitglied ist keine E-Mail hinterlegt." };
  return getLoginBackoffStatus(key);
}

export async function resetMeepleLoginRateLimit(meepleId: string) {
  await requirePermission("members:manage");

  const key = await loginKeyForMeeple(meepleId);
  if (!key) return { error: "Für dieses Mitglied ist keine E-Mail hinterlegt." };
  await adminResetLoginBackoff(key);
  return { success: true as const };
}

export async function lockMeepleLogin(meepleId: string) {
  await requirePermission("members:manage");

  const key = await loginKeyForMeeple(meepleId);
  if (!key) return { error: "Für dieses Mitglied ist keine E-Mail hinterlegt." };
  await setManualLoginLock(key);
  return { success: true as const };
}
