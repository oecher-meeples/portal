import { prisma } from "@/lib/prisma";
import { maskIban } from "@/lib/crypto";
import { requirePermission } from "@/lib/permissions";
import { AdminBankView } from "@/components/feature/admin-bank/admin-bank-view";

const dateTime = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "short",
  timeStyle: "short",
});

export default async function AdminBankPage() {
  await requirePermission("bank:read");

  const [meeples, logs] = await Promise.all([
    prisma.meeple.findMany({
      where: { anonymizedAt: null },
      orderBy: { memberNumber: "asc" },
      select: {
        id: true,
        memberNumber: true,
        displayName: true,
        accountHolder: true,
        ibanLast4: true,
        ibanEncrypted: true,
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
      rows={meeples.map((meeple) => ({
        id: meeple.id,
        memberNumber: meeple.memberNumber,
        displayName: meeple.displayName,
        accountHolder: meeple.accountHolder,
        maskedIban: maskIban(meeple.ibanLast4),
        hasIban: meeple.ibanEncrypted !== null,
      }))}
      logs={logs.map((log) => ({
        id: log.id,
        at: dateTime.format(log.at),
        kind: log.kind,
        accessedBy: log.accessedBy.displayName,
        subject: log.subject?.displayName ?? null,
      }))}
    />
  );
}
