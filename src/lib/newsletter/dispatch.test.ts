import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const sendTransactionalEmailMock = vi.fn();
vi.mock("@/lib/newsletter/mailer", () => ({
  sendTransactionalEmail: (...args: unknown[]) =>
    sendTransactionalEmailMock(...args),
}));

const { queueNewsletterForPost, processNewsletterQueue } =
  await import("./dispatch");

beforeEach(() => {
  sendTransactionalEmailMock.mockReset();
  sendTransactionalEmailMock.mockResolvedValue(undefined);
});

function makeJob(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "job-1",
    postId: "post-1",
    subscriberId: "sub-1",
    status: "PENDING",
    attempts: 0,
    lastError: null,
    sentAt: null,
    createdAt: new Date("2026-08-01"),
    post: {
      id: "post-1",
      title: "Sommerfest",
      excerpt: "Es war toll",
      slug: "sommerfest",
    },
    subscriber: {
      id: "sub-1",
      email: "person@example.com",
      manageToken: "token-1",
    },
    ...overrides,
  } as never;
}

describe("queueNewsletterForPost", () => {
  it("does nothing when the post has no newsletter category", async () => {
    prismaMock.post.findUniqueOrThrow.mockResolvedValue({
      id: "post-1",
      newsletterCategory: null,
    } as never);

    await queueNewsletterForPost("post-1");

    expect(prismaMock.newsletterSubscriber.findMany).not.toHaveBeenCalled();
    expect(prismaMock.post.update).not.toHaveBeenCalled();
  });

  it("queues a dispatch job per confirmed subscriber matching the category", async () => {
    prismaMock.post.findUniqueOrThrow.mockResolvedValue({
      id: "post-1",
      newsletterCategory: "NEWS",
    } as never);
    prismaMock.newsletterSubscriber.findMany.mockResolvedValue([
      { id: "sub-1" },
      { id: "sub-2" },
    ] as never);

    await queueNewsletterForPost("post-1");

    expect(prismaMock.newsletterSubscriber.findMany).toHaveBeenCalledWith({
      where: { status: "CONFIRMED", categories: { has: "NEWS" } },
      select: { id: true },
    });
    expect(prismaMock.newsletterDispatchJob.createMany).toHaveBeenCalledWith({
      data: [
        { postId: "post-1", subscriberId: "sub-1" },
        { postId: "post-1", subscriberId: "sub-2" },
      ],
      skipDuplicates: true,
    });
    expect(prismaMock.post.update).toHaveBeenCalledWith({
      where: { id: "post-1" },
      data: { newsletterStatus: "QUEUED" },
    });
  });

  it("still marks the post QUEUED when no subscriber matches the category", async () => {
    prismaMock.post.findUniqueOrThrow.mockResolvedValue({
      id: "post-1",
      newsletterCategory: "BERICHTE",
    } as never);
    prismaMock.newsletterSubscriber.findMany.mockResolvedValue([]);

    await queueNewsletterForPost("post-1");

    expect(prismaMock.newsletterDispatchJob.createMany).not.toHaveBeenCalled();
    expect(prismaMock.post.update).toHaveBeenCalledWith({
      where: { id: "post-1" },
      data: { newsletterStatus: "QUEUED" },
    });
  });
});

describe("processNewsletterQueue", () => {
  it("sends due jobs individually, each with the subscriber's own manage link", async () => {
    prismaMock.newsletterDispatchJob.findMany.mockResolvedValue([
      makeJob(),
    ] as never);
    prismaMock.newsletterDispatchJob.count.mockResolvedValue(0);

    const summary = await processNewsletterQueue(10);

    expect(summary).toEqual({ processed: 1, succeeded: 1, failed: 0 });
    expect(sendTransactionalEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "person@example.com",
        html: expect.stringContaining("token=token-1"),
      }),
    );
    expect(prismaMock.newsletterDispatchJob.update).toHaveBeenCalledWith({
      where: { id: "job-1" },
      data: expect.objectContaining({ status: "SENT" }),
    });
  });

  it("increments attempts and requeues below the attempt limit on failure", async () => {
    prismaMock.newsletterDispatchJob.findMany.mockResolvedValue([
      makeJob({ attempts: 1 }),
    ] as never);
    prismaMock.newsletterDispatchJob.count.mockResolvedValue(0);
    sendTransactionalEmailMock.mockRejectedValue(new Error("Rate limit"));

    const summary = await processNewsletterQueue(10);

    expect(summary).toEqual({ processed: 1, succeeded: 0, failed: 1 });
    expect(prismaMock.newsletterDispatchJob.update).toHaveBeenCalledWith({
      where: { id: "job-1" },
      data: expect.objectContaining({ attempts: 2, status: "QUEUED" }),
    });
  });

  it("marks a job FAILED once the attempt limit is reached", async () => {
    prismaMock.newsletterDispatchJob.findMany.mockResolvedValue([
      makeJob({ attempts: 2 }),
    ] as never);
    prismaMock.newsletterDispatchJob.count.mockResolvedValue(0);
    sendTransactionalEmailMock.mockRejectedValue(new Error("Rate limit"));

    await processNewsletterQueue(10);

    expect(prismaMock.newsletterDispatchJob.update).toHaveBeenCalledWith({
      where: { id: "job-1" },
      data: expect.objectContaining({ attempts: 3, status: "FAILED" }),
    });
  });

  it("marks the post SENT once all its jobs are done", async () => {
    prismaMock.newsletterDispatchJob.findMany.mockResolvedValue([
      makeJob(),
    ] as never);
    prismaMock.newsletterDispatchJob.count
      .mockResolvedValueOnce(0) // remaining pending/queued
      .mockResolvedValueOnce(0); // failed

    await processNewsletterQueue(10);

    expect(prismaMock.post.update).toHaveBeenCalledWith({
      where: { id: "post-1" },
      data: expect.objectContaining({ newsletterStatus: "SENT" }),
    });
  });

  it("marks the post FAILED when some of its jobs ultimately failed", async () => {
    prismaMock.newsletterDispatchJob.findMany.mockResolvedValue([
      makeJob({ attempts: 2 }),
    ] as never);
    sendTransactionalEmailMock.mockRejectedValue(new Error("boom"));
    prismaMock.newsletterDispatchJob.count
      .mockResolvedValueOnce(0) // remaining pending/queued
      .mockResolvedValueOnce(1); // failed

    await processNewsletterQueue(10);

    expect(prismaMock.post.update).toHaveBeenCalledWith({
      where: { id: "post-1" },
      data: expect.objectContaining({ newsletterStatus: "FAILED" }),
    });
  });

  it("leaves the post status untouched while jobs are still pending", async () => {
    prismaMock.newsletterDispatchJob.findMany.mockResolvedValue([
      makeJob(),
    ] as never);
    prismaMock.newsletterDispatchJob.count.mockResolvedValue(2);

    await processNewsletterQueue(10);

    expect(prismaMock.post.update).not.toHaveBeenCalled();
  });
});
