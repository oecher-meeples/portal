import "server-only";
import { randomBytes } from "node:crypto";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/utils/prisma";
import { requirePermission } from "@/lib/auth/permissions";
import { isValidEmail } from "@/lib/utils/validate-email";

/**
 * `@neondatabase/auth`s Typen für `auth.admin`/`auth.requestPasswordReset`
 * lösen strukturell auf `unknown` auf (Pick<VanillaBetterAuthClient, …> ohne
 * Plugin-Inferenz) — der Endpunkt existiert laut `API_ENDPOINTS`, aber ohne
 * generierte Typen. Lokale Minimal-Signaturen statt `any`, siehe Blocker-Notiz
 * unten.
 */
type AdminAuth = {
  admin: {
    createUser: (args: { email: string; name: string; password: string }) => Promise<{
      data?: { user: { id: string } } | null;
      error?: { message?: string } | null;
    }>;
  };
  requestPasswordReset: (args: { email: string }) => Promise<unknown>;
};

/**
 * Legt ein Login ohne begleitendes `Member` an (#329) — für Funktionsmailboxen
 * o.ä., nicht für ein reguläres Vereinsmitglied (dafür: Einladung). Gate ist
 * unser eigenes `admin:access` (nicht better-auths `role`/`adminUserIds` —
 * siehe Blocker-Hinweis im Ausführungsplan, Paket 3): `auth.admin.createUser`
 * läuft gegen den gehosteten Neon-Auth-Dienst und autorisiert dort nach
 * dessen eigenem Rollenmodell. Vor produktivem Einsatz einmal gegen eine
 * echte Neon-Auth-Instanz smoke-testen — hier ungetestet gegen die live API.
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

  const adminAuth = auth as unknown as AdminAuth;
  const { data, error } = await adminAuth.admin.createUser({
    email: trimmedEmail,
    name: trimmedName,
    // Zufälliges Passwort statt keins — der Reset-Link direkt danach ist der
    // einzige Weg, wie das Konto je ein nutzbares Passwort bekommt (#324 ist
    // noch offen, siehe Plan-Blocker).
    password: randomBytes(24).toString("hex"),
  });
  if (error || !data?.user) {
    return {
      error: `Systemkonto konnte nicht angelegt werden: ${
        error?.message ?? "unbekannter Fehler"
      }`,
    };
  }

  const meeple = await prisma.meeple.create({
    data: { neonAuthUserId: data.user.id, displayName: trimmedName },
  });

  await adminAuth.requestPasswordReset({ email: trimmedEmail });

  return { success: true as const, meepleId: meeple.id };
}
