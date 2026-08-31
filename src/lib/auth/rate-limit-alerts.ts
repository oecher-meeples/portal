import { prisma } from "@/lib/utils/prisma";

/** Key-Präfixe wie in `src/lib/utils/rate-limit.ts` und den jeweiligen
 * Aufrufstellen (#326) verwendet. */
const LOGIN_EMAIL_PREFIX = "login:email:";
const IBAN_REVEAL_PREFIX = "iban-reveal:";

const LOGIN_BACKOFF_CAP_SECONDS = 8 * 60 * 60;
export const IBAN_REVEAL_MAX_CALLS = 20;
export const IBAN_REVEAL_WINDOW_SECONDS = 10 * 60;

export type RateLimitAlert = {
  kind: "login-cap" | "iban-reveal-limit";
  label: string;
};

/** Danger-Hinweise fürs Admin-Dashboard (#326): Login-Keys am 8h-Deckel und
 * `revealIban`-Konten, die die 20-Aufrufe/10min-Grenze gerade überschreiten. */
export async function getRateLimitAlerts(): Promise<RateLimitAlert[]> {
  const ibanWindowCutoff = new Date(
    Date.now() - IBAN_REVEAL_WINDOW_SECONDS * 1000,
  );

  const rows = await prisma.rateLimitAttempt.findMany({
    where: {
      OR: [
        {
          key: { startsWith: LOGIN_EMAIL_PREFIX },
          currentCooldownSecs: LOGIN_BACKOFF_CAP_SECONDS,
        },
        {
          key: { startsWith: IBAN_REVEAL_PREFIX },
          failCount: { gte: IBAN_REVEAL_MAX_CALLS },
          lastFailedAt: { gte: ibanWindowCutoff },
        },
      ],
    },
    select: { key: true },
  });

  return rows.map((row): RateLimitAlert => {
    if (row.key.startsWith(LOGIN_EMAIL_PREFIX)) {
      return {
        kind: "login-cap",
        label: `Login-Sperre (8h) erreicht: ${row.key.slice(LOGIN_EMAIL_PREFIX.length)}`,
      };
    }
    return {
      kind: "iban-reveal-limit",
      label: `IBAN-Abruf-Limit überschritten (Meeple-ID ${row.key.slice(IBAN_REVEAL_PREFIX.length)})`,
    };
  });
}
