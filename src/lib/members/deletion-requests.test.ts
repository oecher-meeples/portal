import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const {
  DELETION_REQUEST_DEADLINE_MONTHS,
  deletionRequestDeadline,
  deletionRequestStatus,
  findOpenDeletionRequest,
  listPendingDeletionRequests,
} = await import("@/lib/members/deletion-requests");

describe("deletionRequestDeadline", () => {
  it("is one month after the request, per Art. 12 Abs. 3", () => {
    expect(DELETION_REQUEST_DEADLINE_MONTHS).toBe(1);
    expect(deletionRequestDeadline(new Date("2026-03-10T09:00:00Z"))).toEqual(
      new Date("2026-04-10T09:00:00Z"),
    );
  });

  it("clamps into the next month when the target day does not exist", () => {
    // 31 Jan + 1 month has no 31 Feb; Date rolls into March rather than throwing.
    const deadline = deletionRequestDeadline(new Date("2026-01-31T00:00:00Z"));

    expect(deadline.getTime()).toBeGreaterThan(
      new Date("2026-02-27T00:00:00Z").getTime(),
    );
  });

  it("does not mutate the given date", () => {
    const requestedAt = new Date("2026-03-10T09:00:00Z");

    deletionRequestDeadline(requestedAt);

    expect(requestedAt.toISOString()).toBe("2026-03-10T09:00:00.000Z");
  });
});

describe("deletionRequestStatus", () => {
  it("counts the days left before the deadline", () => {
    const status = deletionRequestStatus(
      new Date("2026-03-10T00:00:00Z"),
      new Date("2026-03-31T00:00:00Z"),
    );

    expect(status.daysRemaining).toBe(10);
    expect(status.overdue).toBe(false);
  });

  it("marks a passed deadline as overdue with a negative count", () => {
    const status = deletionRequestStatus(
      new Date("2026-03-10T00:00:00Z"),
      new Date("2026-04-20T00:00:00Z"),
    );

    expect(status.overdue).toBe(true);
    expect(status.daysRemaining).toBeLessThan(0);
  });

  it("is not overdue on the deadline day itself", () => {
    const status = deletionRequestStatus(
      new Date("2026-03-10T00:00:00Z"),
      new Date("2026-04-10T00:00:00Z"),
    );

    expect(status.daysRemaining).toBe(0);
    expect(status.overdue).toBe(false);
  });
});

describe("findOpenDeletionRequest", () => {
  it("only looks at unhandled requests of that meeple", async () => {
    prismaMock.deletionRequest.findFirst.mockResolvedValue(null);

    await findOpenDeletionRequest("meeple-1");

    expect(prismaMock.deletionRequest.findFirst).toHaveBeenCalledWith({
      where: { meepleId: "meeple-1", handledAt: null },
      orderBy: { requestedAt: "asc" },
    });
  });
});

describe("listPendingDeletionRequests", () => {
  beforeEach(() => {
    prismaMock.deletionRequest.findMany.mockResolvedValue([
      {
        id: "req-1",
        meepleId: "meeple-1",
        requestedAt: new Date("2026-03-10T00:00:00Z"),
        handledAt: null,
        meeple: { displayName: "Lea Beispiel" },
      },
    ] as never);
  });

  it("returns open requests with name and computed deadline, oldest first", async () => {
    const requests = await listPendingDeletionRequests(
      new Date("2026-03-31T00:00:00Z"),
    );

    expect(prismaMock.deletionRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { handledAt: null },
        orderBy: { requestedAt: "asc" },
      }),
    );
    expect(requests).toEqual([
      {
        id: "req-1",
        meepleId: "meeple-1",
        displayName: "Lea Beispiel",
        requestedAt: new Date("2026-03-10T00:00:00Z"),
        deadlineAt: new Date("2026-04-10T00:00:00Z"),
        daysRemaining: 10,
        overdue: false,
      },
    ]);
  });
});
