import "server-only";
import { randomBytes } from "node:crypto";
import { auth, createLoginAccount } from "@/lib/auth/server";
import { prisma } from "@/lib/utils/prisma";
import { requirePermission } from "@/lib/auth/permissions";
import { isValidEmail } from "@/lib/utils/validate-email";
import { getRequestOrigin } from "@/lib/utils/request-origin";

/**
 * Legt ein Login ohne begleitendes `Member` an (#329) — für Funktionsmailboxen
 * o.ä., nicht für ein reguläres Vereinsmitglied (dafür: Einladung). Gate ist
 * unser eigenes `admin:access` — better-auths Admin-Plugin (eigenes
 * `role`-Rollenmodell, zusätzliche öffentliche `/admin/*`-Endpunkte) ist
 * bewusst nicht aktiviert; das Konto entsteht serverseitig über
 * `createLoginAccount()` (ohne Session, s. `src/lib/auth/config.ts`).
 */
export async function createSystemkonto({
  email,
  displayName,
}: {
  email: string;
  displayName: string;
}) {
  await requirePermission("admin:access");

  const trimmedEmail = email.trim().toLowerCase();
  const trimmedName = displayName.trim();
  if (!trimmedName) {
    return { error: "Bitte einen Anzeigenamen angeben." };
  }
  if (!isValidEmail(trimmedEmail)) {
    return { error: "Ungültige E-Mail-Adresse." };
  }

  const created = await createLoginAccount({
    email: trimmedEmail,
    name: trimmedName,
    // Zufälliges Passwort statt keins — der Reset-Link direkt danach ist der
    // einzige Weg, wie das Konto je ein nutzbares Passwort bekommt.
    password: randomBytes(24).toString("hex"),
  });
  if ("error" in created) {
    return {
      error: `Systemkonto konnte nicht angelegt werden: ${created.error}`,
    };
  }

  const meeple = await prisma.meeple.create({
    data: { neonAuthUserId: created.userId, displayName: trimmedName },
  });

  // #363: `redirectTo` steuert, wohin der Link in der Reset-Mail zeigt —
  // ohne diesen Wert lief er ins Leere, weil das Portal keine Route für den
  // klassischen Token-Link-Flow hatte. `/passwort-vergessen/einloesen` liest
  // den Token aus der URL und ruft `authClient.resetPassword()` auf.
  const origin = await getRequestOrigin();
  await auth.api.requestPasswordReset({
    body: {
      email: trimmedEmail,
      redirectTo: `${origin}/passwort-vergessen/einloesen`,
    },
  });

  return { success: true as const, meepleId: meeple.id };
}
