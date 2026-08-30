import { prisma } from "@/lib/utils/prisma";
import {
  anonymiseMeepleStufe2,
  anonymiseMemberStufe3,
  listMembersEligibleForStufe3,
} from "@/lib/members/anonymisation";
import { countOpenHoldingsByMemberId } from "@/lib/members/open-holdings";
import { memberDisplayName } from "@/lib/members/member-display-name";
import { sendTransactionalEmail } from "@/lib/newsletter/mailer";
import { applyAusgetretenRole } from "@/lib/auth/ausgetreten-role";

type BlockedMember = { memberId: string; displayName: string };

export type YearTurnCronSummary = {
  stufe2: { anonymised: number; blocked: BlockedMember[] };
  stufe3: { deleted: number; blocked: BlockedMember[] };
};

/** Jahreswechsel-Cron (2.1., 02:00, #331) — läuft einmal jährlich (kein
 * täglicher Job wie `retention.ts`, das ist eine getrennte, weiterhin
 * config-gatete Angelegenheit, siehe #49). Zwei unabhängige Prüfungen:
 * (a) heuer fälliges `membershipEndsAt` + keine offenen Ausleihen → Stufe 2,
 * (b) 12 Monate seit `membershipEndsAt` vorbei + keine offenen Ausleihen →
 * Stufe 3. Blockierte Fälle (offene Ausleihen) landen in einer Sammel-Mail. */
export async function runYearTurnCron(
  now: Date = new Date(),
): Promise<YearTurnCronSummary> {
  const stufe2Candidates = await prisma.member.findMany({
    where: {
      meepleId: { not: null },
      meeple: { anonymizedAt: null },
      membershipEndsAt: { not: null, lte: now },
    },
    include: { meeple: { select: { id: true, displayName: true } } },
  });

  let stufe2Anonymised = 0;
  const stufe2Blocked: BlockedMember[] = [];
  for (const member of stufe2Candidates) {
    const meepleId = member.meepleId!;
    // Vor dem eigentlichen Stufe-2-Versuch: Rechte sofort einschränken (#332)
    // — gilt auch, wenn Stufe 2 gleich an offenen Ausleihen scheitert.
    await applyAusgetretenRole(meepleId);
    const [openGames, openUnits] = await Promise.all([
      countOpenHoldingsByMemberId(member.id),
      prisma.storageUnit.count({
        where: { keeperMeepleId: meepleId, retiredAt: null },
      }),
    ]);
    if (openGames > 0 || openUnits > 0) {
      stufe2Blocked.push({
        memberId: member.id,
        displayName: memberDisplayName(member),
      });
      continue;
    }

    const result = await anonymiseMeepleStufe2(meepleId, now);
    if ("error" in result) {
      stufe2Blocked.push({
        memberId: member.id,
        displayName: memberDisplayName(member),
      });
      continue;
    }
    stufe2Anonymised += 1;
  }

  const stufe3Eligible = await listMembersEligibleForStufe3(now);
  let stufe3Deleted = 0;
  for (const member of stufe3Eligible) {
    const result = await anonymiseMemberStufe3(member.id, now);
    if ("success" in result) stufe3Deleted += 1;
  }
  const stufe3Blocked = await listMembersOverdueForStufe3WithOpenHoldings(now);

  if (stufe2Blocked.length > 0 || stufe3Blocked.length > 0) {
    await sendYearTurnBlockedMail(stufe2Blocked, stufe3Blocked);
  }

  return {
    stufe2: { anonymised: stufe2Anonymised, blocked: stufe2Blocked },
    stufe3: { deleted: stufe3Deleted, blocked: stufe3Blocked },
  };
}

const STUFE3_MIN_MONTHS_SINCE_END = 12;

async function listMembersOverdueForStufe3WithOpenHoldings(
  now: Date,
): Promise<BlockedMember[]> {
  const cutoff = new Date(now);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - STUFE3_MIN_MONTHS_SINCE_END);

  const overdue = await prisma.member.findMany({
    where: { membershipEndsAt: { not: null, lte: cutoff } },
    include: { meeple: { select: { displayName: true } } },
  });

  const blocked: BlockedMember[] = [];
  for (const member of overdue) {
    const openGames = await countOpenHoldingsByMemberId(member.id);
    if (openGames > 0) {
      blocked.push({
        memberId: member.id,
        displayName: memberDisplayName(member),
      });
    }
  }
  return blocked;
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>]/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[char]!,
  );
}

function blockedListHtml(title: string, blocked: BlockedMember[]): string {
  if (blocked.length === 0) return "";
  const items = blocked
    .map((entry) => `<li>${escapeHtml(entry.displayName)}</li>`)
    .join("");
  return `<h3>${escapeHtml(title)}</h3><ul>${items}</ul>`;
}

/** Eine Sammel-Mail statt einer pro Fall — an alle mit `members:manage` oder
 * `games:manage` (permission-, nicht rollenbasiert). */
async function sendYearTurnBlockedMail(
  stufe2Blocked: BlockedMember[],
  stufe3Blocked: BlockedMember[],
) {
  const recipients = await listRecipientsWithAnyPermission([
    "members:manage",
    "games:manage",
  ]);
  if (recipients.length === 0) return;

  const html = [
    "<p>Der Jahreswechsel-Abgleich der Mitgliedschaften konnte einige Fälle nicht automatisch abschließen — offene Ausleihen stehen im Weg:</p>",
    blockedListHtml(
      "Stufe 2 (Login-Löschung) blockiert — bitte Bestand zurückfordern",
      stufe2Blocked,
    ),
    blockedListHtml(
      "Stufe 3 (endgültige Löschung) blockiert — bitte Bestand zurückfordern",
      stufe3Blocked,
    ),
  ].join("\n");

  await Promise.all(
    recipients.map((email) =>
      sendTransactionalEmail({
        to: email,
        subject:
          "Jahreswechsel-Abgleich: offene Ausleihen blockieren Anonymisierung",
        html,
      }),
    ),
  );
}

async function listRecipientsWithAnyPermission(
  permissionKeys: string[],
  now: Date = new Date(),
): Promise<string[]> {
  const rolePermissions = await prisma.rolePermission.findMany({
    where: { permission: { key: { in: permissionKeys } } },
    select: {
      role: {
        select: {
          users: {
            where: {
              startsAt: { lte: now },
              OR: [{ endsAt: null }, { endsAt: { gt: now } }],
            },
            select: { neonAuthUserId: true },
          },
        },
      },
    },
  });

  const neonAuthUserIds = [
    ...new Set(
      rolePermissions.flatMap((rp) =>
        rp.role.users.map((u) => u.neonAuthUserId),
      ),
    ),
  ];
  if (neonAuthUserIds.length === 0) return [];

  const members = await prisma.member.findMany({
    where: { meeple: { neonAuthUserId: { in: neonAuthUserIds } } },
    select: { email: true },
  });
  return members.map((m) => m.email);
}
