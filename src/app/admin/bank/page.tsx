import { prisma } from "@/lib/utils/prisma";
import { maskIban } from "@/lib/utils/crypto";
import { requirePermission } from "@/lib/auth/permissions";
import { AdminBankView } from "@/components/feature/admin-bank/admin-bank-view";
import { formatDateTime } from "@/lib/utils/format";

export default async function AdminBankPage() {
  await requirePermission("bank:read");

  const [members, logs] = await Promise.all([
    // `revealIban` looks a Member up by its linked Meeple (#328), so this
    // overview is scoped to members with a portal account for now — a Member
    // without one can't exist yet outside this package's data migration.
    prisma.member.findMany({
      where: { meepleId: { not: null }, meeple: { anonymizedAt: null } },
      orderBy: { memberNumber: "asc" },
      select: {
        meepleId: true,
        memberNumber: true,
        firstName: true,
        lastName: true,
        email: true,
        accountHolder: true,
        ibanLast4: true,
        ibanEncrypted: true,
        meeple: { select: { displayName: true } },
      },
    }),
    prisma.bankDataAccessLog.findMany({
      orderBy: { at: "desc" },
      take: 25,
      include: {
        accessedBy: { select: { displayName: true } },
        subject: { select: { displayName: true } },
      },
    }),
  ]);

  return (
    <AdminBankView
      rows={members.map((member) => ({
        id: member.meepleId!,
        memberNumber: member.memberNumber,
        displayName:
          [member.firstName, member.lastName].filter(Boolean).join(" ") ||
          member.meeple?.displayName ||
          member.email,
        accountHolder: member.accountHolder,
        maskedIban: maskIban(member.ibanLast4),
        hasIban: member.ibanEncrypted !== null,
      }))}
      logs={logs.map((log) => ({
        id: log.id,
        at: formatDateTime(log.at),
        kind: log.kind,
        accessedBy: log.accessedBy.displayName,
        subject: log.subject?.displayName ?? null,
      }))}
    />
  );
}
