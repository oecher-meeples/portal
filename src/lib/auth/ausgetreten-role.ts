import { prisma } from "@/lib/utils/prisma";
import { assignMeepleRole, removeMeepleRole } from "@/lib/auth/user-roles";

const AUSGETRETEN_ROLE_NAME = "Ausgetreten";

/**
 * #332: nur der Jahreswechsel-Cron (`year-turn-cron.ts`) ruft dies auf, kein
 * UI-Pfad — reduziert Ludothek-/interne-News-/Spielergesuch-Rechte, während
 * zusätzliche Rollen (z. B. "Vorstand") dank Mehrfachrollen erhalten bleiben.
 * No-op, wenn der Meeple kein Login hat oder die Rolle schon aktiv ist.
 */
export async function applyAusgetretenRole(meepleId: string) {
  const meeple = await prisma.meeple.findUnique({ where: { id: meepleId } });
  if (!meeple?.neonAuthUserId) return;

  const role = await prisma.role.findUnique({
    where: { name: AUSGETRETEN_ROLE_NAME },
  });
  if (!role) return;

  const now = new Date();
  const alreadyActive = await prisma.userRole.findFirst({
    where: {
      neonAuthUserId: meeple.neonAuthUserId,
      roleId: role.id,
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
  });
  if (alreadyActive) return;

  await assignMeepleRole(meepleId, role.id);
}

/** Symmetrisches Gegenstück für `revokeResignation` — wird im Plan nicht
 * wörtlich verlangt ("nur der Cron setzt/entfernt"), aber ohne das bliebe
 * jemand nach einer widerrufenen Kündigung dauerhaft eingeschränkt. */
export async function removeAusgetretenRole(meepleId: string) {
  const meeple = await prisma.meeple.findUnique({ where: { id: meepleId } });
  if (!meeple?.neonAuthUserId) return;

  const role = await prisma.role.findUnique({
    where: { name: AUSGETRETEN_ROLE_NAME },
  });
  if (!role) return;

  const now = new Date();
  const active = await prisma.userRole.findFirst({
    where: {
      neonAuthUserId: meeple.neonAuthUserId,
      roleId: role.id,
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
  });
  if (!active) return;

  await removeMeepleRole(active.id);
}
