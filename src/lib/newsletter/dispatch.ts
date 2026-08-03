import {
  NewsletterDispatchStatus,
  NewsletterSubscriberStatus,
  type NewsletterDispatchJob,
  type NewsletterSubscriber,
  type Post,
} from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import { sendTransactionalEmail } from "@/lib/newsletter/mailer";

const MAX_ATTEMPTS = 3;

function siteUrl(): string {
  return process.env.PUBLIC_SITE_URL ?? "";
}

function newsletterEmailHtml(
  post: Pick<Post, "title" | "excerpt" | "slug">,
  manageToken: string,
): string {
  const manageUrl = `${siteUrl()}/newsletter/manage?token=${manageToken}`;
  return [
    `<h1>${post.title}</h1>`,
    `<p>${post.excerpt}</p>`,
    `<p><a href="${siteUrl()}/news/${post.slug}">Mehr dazu</a></p>`,
    `<p><a href="${manageUrl}">Newsletter-Einstellungen verwalten oder abbestellen</a></p>`,
  ].join("\n");
}

/** Only called once a post is published — see admin-news actions.ts. */
export async function queueNewsletterForPost(postId: string): Promise<void> {
  const post = await prisma.post.findUniqueOrThrow({ where: { id: postId } });
  if (!post.newsletterCategory) return;

  const subscribers = await prisma.newsletterSubscriber.findMany({
    where: {
      status: NewsletterSubscriberStatus.CONFIRMED,
      categories: { has: post.newsletterCategory },
    },
    select: { id: true },
  });

  if (subscribers.length > 0) {
    await prisma.newsletterDispatchJob.createMany({
      data: subscribers.map((subscriber) => ({
        postId,
        subscriberId: subscriber.id,
      })),
      skipDuplicates: true,
    });
  }

  await prisma.post.update({
    where: { id: postId },
    data: { newsletterStatus: NewsletterDispatchStatus.QUEUED },
  });
}

type DueJob = NewsletterDispatchJob & {
  post: Post;
  subscriber: NewsletterSubscriber;
};

function findDueJobs(limit: number): Promise<DueJob[]> {
  return prisma.newsletterDispatchJob.findMany({
    where: {
      status: {
        in: [NewsletterDispatchStatus.PENDING, NewsletterDispatchStatus.QUEUED],
      },
      attempts: { lt: MAX_ATTEMPTS },
    },
    take: limit,
    include: { post: true, subscriber: true },
  });
}

async function processJob(job: DueJob): Promise<boolean> {
  try {
    await sendTransactionalEmail({
      to: job.subscriber.email,
      subject: job.post.title,
      html: newsletterEmailHtml(job.post, job.subscriber.manageToken),
    });
    await prisma.newsletterDispatchJob.update({
      where: { id: job.id },
      data: {
        status: NewsletterDispatchStatus.SENT,
        sentAt: new Date(),
        lastError: null,
      },
    });
    return true;
  } catch (error) {
    const attempts = job.attempts + 1;
    await prisma.newsletterDispatchJob.update({
      where: { id: job.id },
      data: {
        attempts,
        lastError:
          error instanceof Error ? error.message : "Unbekannter Fehler",
        status:
          attempts >= MAX_ATTEMPTS
            ? NewsletterDispatchStatus.FAILED
            : NewsletterDispatchStatus.QUEUED,
      },
    });
    return false;
  }
}

/** Recomputes a post's aggregate newsletter status once its jobs have been processed. */
async function syncPostDispatchStatus(postId: string): Promise<void> {
  const remaining = await prisma.newsletterDispatchJob.count({
    where: {
      postId,
      status: {
        in: [NewsletterDispatchStatus.PENDING, NewsletterDispatchStatus.QUEUED],
      },
    },
  });
  if (remaining > 0) return;

  const failed = await prisma.newsletterDispatchJob.count({
    where: { postId, status: NewsletterDispatchStatus.FAILED },
  });

  await prisma.post.update({
    where: { id: postId },
    data: {
      newsletterStatus:
        failed > 0
          ? NewsletterDispatchStatus.FAILED
          : NewsletterDispatchStatus.SENT,
      newsletterSentAt: failed > 0 ? undefined : new Date(),
    },
  });
}

/** Called by the shared cron endpoint (same one Instagram uses) — respects Brevo's daily limit via `limit`. */
export async function processNewsletterQueue(limit: number): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const dueJobs = await findDueJobs(limit);

  let succeeded = 0;
  let failed = 0;
  const affectedPostIds = new Set<string>();
  for (const job of dueJobs) {
    const success = await processJob(job);
    if (success) succeeded++;
    else failed++;
    affectedPostIds.add(job.postId);
  }

  for (const postId of affectedPostIds) {
    await syncPostDispatchStatus(postId);
  }

  return { processed: dueJobs.length, succeeded, failed };
}
