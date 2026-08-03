import { prisma } from "@/lib/utils/prisma";

/**
 * Art. 12 Abs. 3 DSGVO: a request must be answered without undue delay, in any
 * case within one month of receipt. Named, not inlined, so the statutory basis
 * of the number stays visible (see BANK_LOG_RETENTION_MONTHS for the pattern).
 */
export const DELETION_REQUEST_DEADLINE_MONTHS = 1;

export type DeletionRequestDeadline = {
  deadlineAt: Date;
  daysRemaining: number;
  overdue: boolean;
};

/** Computed in UTC so the deadline does not shift by an hour across a DST change. */
export function deletionRequestDeadline(requestedAt: Date): Date {
  const deadline = new Date(requestedAt);
  deadline.setUTCMonth(
    deadline.getUTCMonth() + DELETION_REQUEST_DEADLINE_MONTHS,
  );
  return deadline;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function deletionRequestStatus(
  requestedAt: Date,
  now: Date = new Date(),
): DeletionRequestDeadline {
  const deadlineAt = deletionRequestDeadline(requestedAt);
  const daysRemaining = Math.ceil(
    (deadlineAt.getTime() - now.getTime()) / MS_PER_DAY,
  );
  return { deadlineAt, daysRemaining, overdue: daysRemaining < 0 };
}

/** The member's own still-open request, if any — at most one exists at a time. */
export async function findOpenDeletionRequest(meepleId: string) {
  return prisma.deletionRequest.findFirst({
    where: { meepleId, handledAt: null },
    orderBy: { requestedAt: "asc" },
  });
}

export type PendingDeletionRequest = {
  id: string;
  meepleId: string;
  displayName: string;
  requestedAt: Date;
  deadlineAt: Date;
  daysRemaining: number;
  overdue: boolean;
};

/** All open requests with their deadline, oldest first — the admin queue. */
export async function listPendingDeletionRequests(
  now: Date = new Date(),
): Promise<PendingDeletionRequest[]> {
  const requests = await prisma.deletionRequest.findMany({
    where: { handledAt: null },
    orderBy: { requestedAt: "asc" },
    include: { meeple: { select: { displayName: true } } },
  });

  return requests.map((request) => ({
    id: request.id,
    meepleId: request.meepleId,
    displayName: request.meeple.displayName,
    requestedAt: request.requestedAt,
    ...deletionRequestStatus(request.requestedAt, now),
  }));
}
