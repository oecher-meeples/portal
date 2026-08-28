import { timingSafeEqual } from "node:crypto";

/** Constant-time check of the `Authorization: Bearer <CRON_SECRET>` header
 * every cron route in this app requires (Vercel Cron + manual triggers). */
export function isAuthorizedCronRequest(
  authHeader: string | null,
  cronSecret: string,
) {
  if (!authHeader) return false;
  const expected = Buffer.from(`Bearer ${cronSecret}`);
  const actual = Buffer.from(authHeader);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
