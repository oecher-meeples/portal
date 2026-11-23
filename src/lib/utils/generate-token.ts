import { randomBytes } from "node:crypto";

/** Cryptographically random, URL-safe management token — used wherever an
 * unauthenticated party is identified by a link instead of a login
 * (newsletter manage-token, Bring & Buy external-seller token, …). */
export function generateToken(): string {
  return randomBytes(32).toString("hex");
}
