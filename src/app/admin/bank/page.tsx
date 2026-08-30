import { PendingChangeKind } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import { ibanLast4, maskIban } from "@/lib/utils/crypto";
import { requirePermission } from "@/lib/auth/permissions";
import { AdminBankView } from "@/components/feature/admin-bank/admin-bank-view";
import { formatDateTime } from "@/lib/utils/format";
import { listOpenPendingChanges } from "@/lib/members/pending-changes";
import { memberDisplayName } from "@/lib/members/member-display-name";

export default async function AdminBankPage() {
  await requirePermission("bank:read");

  const [members, logs, pendingChanges] = await Promise.all([
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
    listOpenPendingChanges(),
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
      pendingIbanChanges={pendingChanges
        .filter((change) => change.kind === PendingChangeKind.IBAN)
        .map((change) => ({
          id: change.id,
          memberDisplayName: memberDisplayName(change.member),
          memberNumber: change.member.memberNumber,
          displayValue: maskIban(ibanLast4(change.newValue)),
          requestedAt: change.requestedAt.toISOString(),
          confirmed: true,
        }))}
    />
  );
}
