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

/**
 * Einstiegs-Check für jede `app/api/cron/*`-Route: `null`, wenn die Anfrage
 * autorisiert ist, sonst die fertige Fehler-Response (500 ohne konfiguriertes
 * `CRON_SECRET`, 401 bei falschem Header).
 *
 *   const denied = requireCronAuth(request);
 *   if (denied) return denied;
 */
export function requireCronAuth(request: Request): Response | null {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return Response.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 },
    );
  }
  if (
    !isAuthorizedCronRequest(request.headers.get("authorization"), cronSecret)
  ) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
