import { prisma } from "@/lib/utils/prisma";

const SINGLETON_ID = "singleton";

/** Reads the admin-configured default invite validity (#329) — creates the
 * singleton row with the schema default (7 days) on first read, so callers
 * never have to deal with "no settings row yet". */
export async function getDefaultInviteDays(): Promise<number> {
  const settings = await prisma.inviteSettings.upsert({
    where: { id: SINGLETON_ID },
    update: {},
    create: { id: SINGLETON_ID },
  });
  return settings.defaultDays;
}

export async function setDefaultInviteDays(days: number): Promise<void> {
  await prisma.inviteSettings.upsert({
    where: { id: SINGLETON_ID },
    update: { defaultDays: days },
    create: { id: SINGLETON_ID, defaultDays: days },
  });
}
